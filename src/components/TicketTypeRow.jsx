import { Trash2 } from 'lucide-react'

export default function TicketTypeRow({ index, register, errors, onRemove, canRemove, soldQty = 0 }) {
  const nameErr        = errors?.ticket_types?.[index]?.name
  const priceErr       = errors?.ticket_types?.[index]?.price
  const quantityErr    = errors?.ticket_types?.[index]?.quantity

  return (
    <div className="flex gap-3 items-start bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex-1 min-w-0">
        <input
          placeholder="Ticket name (e.g. General, VIP)"
          {...register(`ticket_types.${index}.name`, { required: 'Name required' })}
          className={`w-full bg-transparent border-b ${nameErr ? 'border-red-400' : 'border-gray-300'} focus:border-primary pb-1 text-gray-900 placeholder-gray-400 focus:outline-none text-sm transition`}
        />
        {nameErr && <p className="text-red-500 text-xs mt-1">{nameErr.message}</p>}
      </div>

      <div className="w-28">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
          <input
            type="number" min="0" step="0.01" placeholder="0.00"
            {...register(`ticket_types.${index}.price`, {
              required: 'Required',
              min: { value: 0, message: 'Must be $0 or more' },
              valueAsNumber: true,
            })}
            className={`w-full bg-white border ${priceErr ? 'border-red-400' : 'border-gray-300'} rounded-lg pl-7 pr-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition`}
          />
        </div>
        {priceErr && <p className="text-red-500 text-xs mt-1">{priceErr.message}</p>}
      </div>

      <div className="w-24">
        <input
          type="number" min={soldQty || 1} placeholder="Total qty"
          {...register(`ticket_types.${index}.quantity`, {
            required: 'Required',
            min: { value: soldQty || 1, message: `Min ${soldQty || 1}` },
            valueAsNumber: true,
          })}
          className={`w-full bg-white border ${quantityErr ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary text-sm transition`}
        />
        {quantityErr && <p className="text-red-500 text-xs mt-1">{quantityErr.message}</p>}
      </div>

<button
        type="button" onClick={onRemove} disabled={!canRemove}
        className="mt-1.5 text-gray-400 hover:text-red-500 disabled:opacity-20 transition"
        aria-label="Remove ticket type"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
