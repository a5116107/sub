// Package server provides HTTP server initialization and configuration.
package server

import (
	"log"
	"net/http"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/handler"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/wire"
	"github.com/redis/go-redis/v9"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

// ProviderSet 提供服务器层的依赖
var ProviderSet = wire.NewSet(
	ProvideRouter,
	ProvideHTTPServer,
)

// ProvideRouter 提供路由器
func ProvideRouter(
	cfg *config.Config,
	handlers *handler.Handlers,
	jwtAuth middleware2.JWTAuthMiddleware,
	adminAuth middleware2.AdminAuthMiddleware,
	apiKeyAuth middleware2.APIKeyAuthMiddleware,
	apiKeyService *service.APIKeyService,
	subscriptionService *service.SubscriptionService,
	opsService *service.OpsService,
	settingService *service.SettingService,
	redisClient *redis.Client,
) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware2.Recovery())
	if len(cfg.Server.TrustedProxies) > 0 {
		if err := r.SetTrustedProxies(cfg.Server.TrustedProxies); err != nil {
			log.Printf("Failed to set trusted proxies: %v", err)
		}
	} else {
		if err := r.SetTrustedProxies(nil); err != nil {
			log.Printf("Failed to disable trusted proxies: %v", err)
		}
	}

	return SetupRouter(r, handlers, jwtAuth, adminAuth, apiKeyAuth, apiKeyService, subscriptionService, opsService, settingService, cfg, redisClient)
}

// ProvideHTTPServer 提供 HTTP 服务器
func ProvideHTTPServer(cfg *config.Config, router *gin.Engine) *http.Server {
	httpHandler := http.Handler(router)

	// Apply a global request body cap to protect early request processing paths.
	if cfg.Server.APIMaxBodySize > 0 {
		httpHandler = http.MaxBytesHandler(httpHandler, cfg.Server.APIMaxBodySize)
	}

	// Enable h2c for cleartext HTTP/2 clients when configured.
	if cfg.Server.EnableH2C || cfg.Server.H2C.Enabled {
		h2cCfg := cfg.Server.H2C
		httpHandler = h2c.NewHandler(httpHandler, &http2.Server{
			MaxConcurrentStreams:         h2cCfg.MaxConcurrentStreams,
			IdleTimeout:                  time.Duration(h2cCfg.IdleTimeout) * time.Second,
			MaxReadFrameSize:             uint32(h2cCfg.MaxReadFrameSize),
			MaxUploadBufferPerConnection: int32(h2cCfg.MaxUploadBufferPerConnection),
			MaxUploadBufferPerStream:     int32(h2cCfg.MaxUploadBufferPerStream),
		})
		log.Printf(
			"HTTP/2 Cleartext (h2c) enabled: streams=%d idle_timeout=%ds max_frame=%d conn_buf=%d stream_buf=%d",
			h2cCfg.MaxConcurrentStreams,
			h2cCfg.IdleTimeout,
			h2cCfg.MaxReadFrameSize,
			h2cCfg.MaxUploadBufferPerConnection,
			h2cCfg.MaxUploadBufferPerStream,
		)
	}

	return &http.Server{
		Addr:    cfg.Server.Address(),
		Handler: httpHandler,
		// ReadHeaderTimeout: 读取请求头的超时时间，防止慢速请求头攻击
		ReadHeaderTimeout: time.Duration(cfg.Server.ReadHeaderTimeout) * time.Second,
		// IdleTimeout: 空闲连接超时时间，释放不活跃的连接资源
		IdleTimeout: time.Duration(cfg.Server.IdleTimeout) * time.Second,
		// 注意：不设置 WriteTimeout，因为流式响应可能持续十几分钟
		// 不设置 ReadTimeout，因为大请求体可能需要较长时间读取
	}
}
