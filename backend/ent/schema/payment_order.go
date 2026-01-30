package schema

import (
	"github.com/Wei-Shaw/sub2api/ent/schema/mixins"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// PaymentOrder holds the schema definition for the PaymentOrder entity.
type PaymentOrder struct {
	ent.Schema
}

func (PaymentOrder) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "payment_orders"},
	}
}

func (PaymentOrder) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
	}
}

func (PaymentOrder) Fields() []ent.Field {
	return []ent.Field{
		field.String("order_no").
			MaxLen(64).
			NotEmpty().
			Unique(),
		field.Int64("user_id"),

		field.String("provider").
			MaxLen(20).
			NotEmpty(),
		field.String("channel").
			MaxLen(20).
			Optional().
			Nillable(),

		field.String("currency").
			MaxLen(10).
			Default("USD"),
		field.Float("amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}).
			Default(0),
		field.String("status").
			MaxLen(20).
			Default("pending"),

		field.String("provider_order_id").
			MaxLen(128).
			Optional().
			Nillable(),
		field.String("provider_payment_id").
			MaxLen(128).
			Optional().
			Nillable(),
		field.String("provider_checkout_id").
			MaxLen(128).
			Optional().
			Nillable(),

		field.JSON("provider_payload", map[string]any{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),

		field.String("description").
			Optional().
			Nillable().
			SchemaType(map[string]string{dialect.Postgres: "text"}),

		field.Time("paid_at").
			Optional().
			Nillable().
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("expires_at").
			Optional().
			Nillable().
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (PaymentOrder) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("payment_orders").
			Field("user_id").
			Unique().
			Required(),
	}
}

func (PaymentOrder) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("provider"),
		index.Fields("status"),
		index.Fields("provider_order_id"),
		index.Fields("provider", "provider_order_id").Unique(),
		index.Fields("provider", "provider_checkout_id").Unique(),
		index.Fields("provider", "provider_payment_id").Unique(),
		index.Fields("created_at"),
	}
}
