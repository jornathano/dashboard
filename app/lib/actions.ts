'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Scheherazade_New } from 'next/font/google';

const InvoiceSchema = z.object({
    id: z.string(),
    customerId : z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string()
});

const CreateInvoice = InvoiceSchema.omit({
    id: true,
    date: true
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
 
export async function createInvoice(prevState: State, formData: FormData) {

    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount:     formData.get('amount'),
        status:     formData.get('status')
      });

      // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Wypełnij wszystkie wymagane pola formularza!',
      };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = (new Date).toISOString().split('T')[0];
      try {
        await sql`
          INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
      } catch(error) {
        return { message: "Database error: Błąd przy tworzeniu faktury" };
      }
    

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

const EditInvoice = InvoiceSchema.omit({id: true, date: true});

export async function editInvoice(id: string, prevState: State, formData: FormData) {

  const validatedFields = EditInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });

  if(!validatedFields.success) {
    return {
      message: "Formularz nie przeszedł walidacji",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }


  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

    try {
        await sql`
        UPDATE invoices 
        SET customer_id=${customerId}, amount=${amountInCents}, status=${status}
        WHERE id=${id}
      `;
    } catch(e) {
      return { message: "Database error: Nie można zaktualizować faktury."} ;
    }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice (id: string) {

  //throw new Error('Failed to Delete Invoice');

  try {
    await sql`DELETE FROM invoices WHERE id=${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: "Faktura usunięta." };
  } catch(e) {
    return { message: "Database Error: Nie można usunąć faktury." };
  }
    
}