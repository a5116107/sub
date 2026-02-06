package ent

import "entgo.io/ent/dialect"

// Driver exposes the underlying dialect driver.
//
// This is intentionally kept outside the generated code so app wiring can
// access *sql.DB via *dialect/sql.Driver when needed.
func (c *Client) Driver() dialect.Driver {
	return c.driver
}
