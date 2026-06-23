import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { orderId } = req.body
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, subtotal, quantity, buyer_name, buyer_email, ticket_type_id, event_id, events(title, event_date), ticket_types(name)')
    .eq('id', orderId)
    .single()

  if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'paid') return res.status(400).json({ error: `Order is already ${order.status}` })

  // Flag the order — admin processes the actual Stripe refund manually
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'refund_requested' })
    .eq('id', orderId)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  // Notify Tiklo admin
  try {
    const eventTitle = order.events?.title ?? 'Unknown event'
    const eventDate = order.events?.event_date
      ? new Date(order.events.event_date).toLocaleDateString('en-CA', { dateStyle: 'medium' })
      : ''

    await resend.emails.send({
      from: 'Tiklo <tickets@tiklo.ca>',
      to: 'danalytica.ltd@gmail.com',
      subject: `[Refund Request] ${order.buyer_name} — ${eventTitle}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0A2540;">Refund requested by organiser</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Order ID</td><td style="font-family:monospace;font-weight:600;">${orderId.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Buyer</td><td>${order.buyer_name} &lt;${order.buyer_email}&gt;</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Event</td><td>${eventTitle}${eventDate ? ' · ' + eventDate : ''}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Ticket</td><td>${order.ticket_types?.name ?? '—'} × ${order.quantity}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="font-weight:700;color:#635BFF;">$${Number(order.subtotal ?? 0).toFixed(2)} CAD</td></tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#6b7280;">
            Process this refund in the
            <a href="https://dashboard.stripe.com/payments" style="color:#635BFF;">Stripe dashboard</a>
            and then mark the order as refunded in Supabase.
          </p>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[refund] admin email failed:', emailErr.message)
    // Don't fail — DB is already updated
  }

  res.json({ ok: true })
}
