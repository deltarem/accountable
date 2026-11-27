import { Archive, ArchiveRestore } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import { Chip } from "../../components/Chip";
import { LoadFailed } from "../../components/LoadFailed";
import { MissingRecord } from "../../components/MissingRecord";
import { ApiError } from "../../lib/api";
import { cents } from "../../lib/money";
import { recordId } from "../../lib/validate";
import { ProductForm } from "../forms/ProductForm";
import { useProduct, useSetProductActive } from "../queries";
import { AddedAndChanged, Detail, NONE, RecordHeader, SidePanel } from "../RecordLayout";

export function Product() {
  const id = recordId(useParams().id);
  if (id === null) return <MissingRecord word="product" to="/products" section="Products" />;
  return <ProductRecord id={id} />;
}

function ProductRecord({ id }: { id: number }) {
  const product = useProduct(id);
  const setActive = useSetProductActive();
  const [editing, setEditing] = useState(false);

  if (product.error instanceof ApiError && product.error.kind === "missing") {
    return <MissingRecord word="product" to="/products" section="Products" />;
  }
  if (!product.data) return <LoadFailed onPage error={product.error} onRetry={() => product.refetch()} />;
  const record = product.data;

  return (
    <>
      <RecordHeader
        title={record.name}
        chips={!record.active && <Chip tone="archived">Archived</Chip>}
        onEdit={() => setEditing(true)}
        action={{
          label: record.active ? "Archive" : "Restore",
          icon: record.active ? (
            <Archive size={15} aria-hidden="true" />
          ) : (
            <ArchiveRestore size={15} aria-hidden="true" />
          ),
          onClick: () => setActive(record, !record.active),
        }}
      />
      <LoadFailed onPage keeping error={product.error} onRetry={() => product.refetch()} />
      {/* No timeline, so the panel keeps the left column's width and the rest stays empty (G10). */}
      <div className="max-w-[420px] px-5 pb-4">
        <SidePanel title="Details">
          <dl>
            <Detail label="Unit price">
              <span className="num text-[13px]">{cents(record.unit_price_cents)}</span>
            </Detail>
            {/* Under its label, as a description can run to several lines, with their breaks kept. */}
            <div className="py-1">
              <dt className="text-[13px] leading-[18px] font-semibold">Description</dt>
              <dd className="mt-0.5 break-words whitespace-pre-wrap">{record.description ?? NONE}</dd>
            </div>
          </dl>
          <AddedAndChanged record={record} />
        </SidePanel>
      </div>
      {editing && <ProductForm record={record} onClose={() => setEditing(false)} />}
    </>
  );
}
