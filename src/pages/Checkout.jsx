import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '../lib/stripe'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'

function CheckoutForm({ orderId, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError(null)
    setProcessing(true)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/ticket/confirmed?order=${orderId}`,
      },
    })

    if (stripeError) {
      setError(stripeError.message)
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" disabled={!stripe || processing} size="lg" className="w-full">
        {processing ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  )
}

export default function Checkout() {
  const { orderId: eventId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const ticketTypeId = searchParams.get('tt')
  const qty = parseInt(searchParams.get('qty') ?? '1', 10)

  const [clientSecret, setClientSecret] = useState(null)
  const [orderId, setOrderId] = useState(null)
  const [event, setEvent] = useState(null)
  const [ticketType, setTicketType] = useState(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [step, setStep] = useState('info') // 'info' | 'payment'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single()
      const { data: tt } = await supabase.from('ticket_types').select('*').eq('id', ticketTypeId).single()
      setEvent(ev)
      setTicketType(tt)
    }
    if (eventId && ticketTypeId) load()
  }, [eventId, ticketTypeId])

  async function handleInfoSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          quantity: qty,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setOrderId(data.order_id)

      if (data.free) {
        navigate(`/ticket/confirmed?order=${data.order_id}`)
        return
      }

      setClientSecret(data.client_secret)
      setStep('payment')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!event || !ticketType) return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <div className="h-8 bg-gray-100 rounded w-2/3 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )

  const total = ticketType.price * qty

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Order summary */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Order summary</p>
          <h2 className="font-heading font-bold text-gray-900 text-lg">{event.title}</h2>
          <div className="flex justify-between items-center mt-3 text-sm">
            <span className="text-muted">{ticketType.name} × {qty}</span>
            <span className="text-gray-900 font-semibold">{total === 0 ? 'Free' : `$${total.toFixed(2)} CAD`}</span>
          </div>
          {total > 0 && (
            <div className="flex justify-between items-center mt-1 text-xs text-muted">
              <span>Platform fee</span>
              <span>${((total * 0.025) + (0.99 * qty)).toFixed(2)}</span>
            </div>
          )}
        </div>

        {step === 'info' ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900 mb-4">Your details</h2>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Full name</label>
                <input
                  required value={buyerName} onChange={e => setBuyerName(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Email — tickets will be sent here</label>
                <input
                  type="email" required value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-primary transition"
                />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? 'Please wait…' : total === 0 ? 'Get free tickets' : 'Continue to payment'}
              </Button>
            </form>
          </div>
        ) : clientSecret ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-heading font-bold text-gray-900 mb-4">Payment</h2>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#DC5E3D' } }, defaultValues: { billingDetails: { address: { country: 'CA' } } } }}
            >
              <CheckoutForm orderId={orderId} />
            </Elements>
          </div>
        ) : null}
      </div>
    </div>
  )
}
