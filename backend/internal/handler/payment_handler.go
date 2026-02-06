package handler

import (
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	paymentService *service.PaymentService
}

func NewPaymentHandler(paymentService *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

func (h *PaymentHandler) ListProviders(c *gin.Context) {
	_, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	providers, err := h.paymentService.ListProviders()
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"providers": providers})
}

type createTopUpRequest struct {
	Amount   float64 `json:"amount" binding:"required"`
	Provider string  `json:"provider" binding:"required"`
	Channel  string  `json:"channel"`
}

func (h *PaymentHandler) CreateTopUp(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req createTopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	res, err := h.paymentService.CreateTopUp(c.Request.Context(), subject.UserID, req.Amount, req.Provider, req.Channel)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, res)
}

func (h *PaymentHandler) GetOrder(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		response.BadRequest(c, "Invalid id")
		return
	}

	order, err := h.paymentService.GetOrder(c.Request.Context(), subject.UserID, id)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, paymentOrderToResponse(order))
}

type paymentOrderResponse struct {
	ID          int64      `json:"id"`
	OrderNo     string     `json:"order_no"`
	Provider    string     `json:"provider"`
	Channel     *string    `json:"channel,omitempty"`
	Currency    string     `json:"currency"`
	Amount      float64    `json:"amount"`
	Status      string     `json:"status"`
	Description *string    `json:"description,omitempty"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func paymentOrderToResponse(order *service.PaymentOrder) *paymentOrderResponse {
	if order == nil {
		return nil
	}
	return &paymentOrderResponse{
		ID:          order.ID,
		OrderNo:     order.OrderNo,
		Provider:    order.Provider,
		Channel:     order.Channel,
		Currency:    order.Currency,
		Amount:      order.Amount,
		Status:      order.Status,
		Description: order.Description,
		PaidAt:      order.PaidAt,
		ExpiresAt:   order.ExpiresAt,
		CreatedAt:   order.CreatedAt,
		UpdatedAt:   order.UpdatedAt,
	}
}

func (h *PaymentHandler) PayPalWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		if maxErr, ok := extractMaxBytesError(err); ok {
			response.Error(c, http.StatusRequestEntityTooLarge, buildBodyTooLargeMessage(maxErr.Limit))
			return
		}
		response.BadRequest(c, "Invalid body")
		return
	}
	if err := h.paymentService.HandlePayPalWebhook(c.Request.Context(), c.Request.Header, body); err != nil {
		// PayPal retries on non-2xx.
		response.ErrorFrom(c, err)
		return
	}
	c.Status(http.StatusOK)
}

func (h *PaymentHandler) CreemWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		if maxErr, ok := extractMaxBytesError(err); ok {
			response.Error(c, http.StatusRequestEntityTooLarge, buildBodyTooLargeMessage(maxErr.Limit))
			return
		}
		response.BadRequest(c, "Invalid body")
		return
	}
	signature := c.GetHeader("creem-signature")
	if err := h.paymentService.HandleCreemWebhook(c.Request.Context(), signature, body); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	c.Status(http.StatusOK)
}

func (h *PaymentHandler) EPayWebhook(c *gin.Context) {
	// EasyPay often sends GET notify; support both GET and POST form.
	values := url.Values{}
	for k, v := range c.Request.URL.Query() {
		values[k] = v
	}
	_ = c.Request.ParseForm()
	for k, v := range c.Request.PostForm {
		values[k] = v
	}

	respBody, err := h.paymentService.HandleEPayNotify(c.Request.Context(), values)
	if err != nil {
		// Always return 200 with body to avoid retries storm.
		c.String(http.StatusOK, respBody)
		return
	}
	c.String(http.StatusOK, respBody)
}
