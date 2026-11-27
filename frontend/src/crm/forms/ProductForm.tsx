import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { priceText, readPrice } from "../../lib/money";
import { useSaveProduct, type Product } from "../queries";
import { showSaveError } from "./server-errors";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  unit_price_cents: z.string().transform((text, context) => {
    const read = readPrice(text);
    if ("cents" in read) return read.cents;
    context.addIssue({ code: "custom", message: read.message });
    return z.NEVER;
  }),
  description: z.string().trim(),
});

type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

type Props = { record?: Product; onClose: () => void };

function initialValues(record?: Product): Input {
  return {
    name: record?.name ?? "",
    unit_price_cents: record ? priceText(record.unit_price_cents) : "",
    description: record?.description ?? "",
  };
}

export function ProductForm({ record, onClose }: Props) {
  const save = useSaveProduct(record?.id);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<Input, unknown, Output>({ resolver: zodResolver(schema), defaultValues: initialValues(record) });

  async function submit(values: Output) {
    try {
      await save.mutateAsync({
        name: values.name,
        unit_price_cents: values.unit_price_cents,
        description: values.description || null,
      });
      toast.success("Product saved.");
      onClose();
    } catch (error) {
      showSaveError(error, { setError, getValues });
    }
  }

  return (
    <FormDialog
      title={record ? "Edit product" : "Add product"}
      submitLabel="Save product"
      pending={save.isPending}
      onClose={onClose}
      onSubmit={handleSubmit(submit)}
    >
      <Field label="Name" htmlFor="product-name" error={errors.name?.message}>
        <input id="product-name" className="input" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Unit price" htmlFor="product-price" error={errors.unit_price_cents?.message}>
        <div className="relative">
          <span aria-hidden="true" className="num absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted">
            $
          </span>
          <input
            id="product-price"
            inputMode="decimal"
            className="input num pl-7"
            aria-invalid={!!errors.unit_price_cents}
            {...register("unit_price_cents")}
          />
        </div>
      </Field>
      <Field label="Description" htmlFor="product-description" error={errors.description?.message}>
        <textarea id="product-description" rows={3} className="input" {...register("description")} />
      </Field>
    </FormDialog>
  );
}
