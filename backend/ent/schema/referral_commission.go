package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ReferralCommission records inviter rebate from invitee usage.
type ReferralCommission struct {
	ent.Schema
}

func (ReferralCommission) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "referral_commissions"},
	}
}

func (ReferralCommission) Fields() []ent.Field {
	return []ent.Field{
		field.Int64("usage_log_id"),
		field.Int64("inviter_user_id"),
		field.Int64("invitee_user_id"),
		field.Float("amount").
			Default(0).
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,10)"}),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (ReferralCommission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("usage_log_id").Unique(),
		index.Fields("inviter_user_id"),
		index.Fields("invitee_user_id"),
		index.Fields("created_at"),
	}
}
