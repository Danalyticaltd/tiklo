import { Trash2 } from 'lucide-react'

export default function TicketTypeRow({ index, register, errors, onRemove, canRemove }) {
  return (
    <div className="flex gap-3 items-start bg-bg rounded-xl p-4 border border-slate-700">
      <div className="flex-1 min-w-0">
        <input
          placeholder="Ticket name (e.g. General, VIP)"
          {...register(`ticket_types.${index}.name`, { required: 'Name required' })}
          className="w-full bg-transparent border-b border-slate-700 focus:border-primary pb-1 text-slate-100 placeholder-slate-600 focus:outline-none text-sm transition"
        />
        {errors?.ticket_types?.[index]?.name && (
          <p className="text-red-400 text-xs mt-1">{errors.ticket_types[index].name.message}</p>
        )}
      </div>
      <div className="w-28">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
          <input
            type="number" min="0" step="0.01" placeholder="0.00"
            {...register(`ticket_types.${index}.price`, { required: 'Required', min: { value: 0, message: '≥ 0' }, valueAsNumber: true })}
            className="w-full bg-bg border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary text-sm transition"
          />
        </div>
        {errors?.ticket_types?.[index]?.price && (
          <p className="text-red-400 text-xs mt-1">{errors.ticket_types[index].price.message}</p>
        )}
      </div>
      <div className="w-24">
        <input
          type="number" min="1" placeholder="Qty"
          {...register(`ticket_types.${index}.quantity`, { required: 'Required', min: { value: 1, message: '≥ 1' }, valueAsNumber: true })}
          className="w-full bg-bg border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary text-sm transition"
        />
        {errors?.ticket_types?.[index]?.quantity && (
          <p className="text-red-400 text-xs mt-1">{errors.ticket_types[index].quantity.message}</p>
        )}
      </div>
      <button
        type="button" onClick={onRemove} disabled={!canRemove}
        className="mt-1.5 text-slate-600 hover:text-red-400 disabled:opacity-20 transition"
        aria-label="Remove ticket type"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
