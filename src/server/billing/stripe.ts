import "server-only"
import Stripe from "stripe"
import { env } from "@/server/env"

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Subscriptions are currently unavailable.")
    this.name = "BillingNotConfiguredError"
  }
}

let client: Stripe | undefined

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new BillingNotConfiguredError()
  return (client ??= new Stripe(env.STRIPE_SECRET_KEY))
}
