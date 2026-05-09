import { z } from 'zod'

export const submitInvoiceSchema = z.object({
  deliverableDriveLink: z
    .string()
    .url('Tautan deliverable wajib berupa URL valid')
    .regex(/^https?:\/\//i, 'URL harus diawali http:// atau https://'),
  notes: z.string().optional(),
  signatureFileKey: z.string().min(1, 'Tanda tangan wajib'),
})

export type SubmitInvoiceInput = z.infer<typeof submitInvoiceSchema>

export const markInvoicePaidSchema = z.object({
  paidAt: z.coerce.date(),
  paymentRef: z.string().min(1, 'Nomor referensi pembayaran wajib'),
})
