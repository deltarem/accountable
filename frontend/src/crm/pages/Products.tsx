import { Archive, ArchiveRestore } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import { Chip } from "../../components/Chip";
import { DataTable, type TableColumn } from "../../components/DataTable";
import { FilterGroup } from "../../components/FilterGroup";
import { PageHeader } from "../../components/PageHeader";
import { cents } from "../../lib/money";
import type { AddressChange } from "../../lib/useAddress";
import { ProductForm } from "../forms/ProductForm";
import { useProducts, useSetProductActive, type ProductRow } from "../queries";

/** Which products the table shows. No setting in the address means Active (G3). */
type View = "active" | "archived" | "all";

const VIEWS: { view: View; label: string; setting: string | null }[] = [
  { view: "active", label: "Active", setting: null },
  { view: "archived", label: "Archived", setting: "archived" },
  { view: "all", label: "All", setting: "all" },
];

function viewIn(params: URLSearchParams): View {
  return VIEWS.find((item) => item.setting !== null && item.setting === params.get("show"))?.view ?? "active";
}

function isIn(view: View, product: ProductRow) {
  return view === "all" || product.active === (view === "active");
}

export function Products() {
  const products = useProducts();
  const setActive = useSetProductActive();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const view = viewIn(params);

  const rows = useMemo(() => products.data?.filter((product) => isIn(view, product)), [products.data, view]);

  const columns = useMemo<TableColumn<ProductRow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        value: (row) => row.name,
        searchable: true,
        cell: (row) => (
          <>
            {row.name}
            {view === "all" && !row.active && (
              <span className="ml-2">
                <Chip tone="archived">Archived</Chip>
              </span>
            )}
          </>
        ),
      },
      {
        id: "description",
        header: "Description",
        value: (row) => row.description,
        searchable: true,
        cell: (row) => <span className="text-muted">{row.description}</span>,
      },
      {
        id: "unit_price",
        header: "Unit price",
        value: (row) => row.unit_price_cents,
        numeric: true,
        width: "w-[140px]",
        cell: (row) => cents(row.unit_price_cents),
      },
    ],
    [view],
  );

  const filters = (update: (change: AddressChange) => void): ReactNode => (
    <FilterGroup
      label="Show products"
      options={VIEWS.map(({ view: option, label, setting }) => ({
        key: option,
        label,
        count: products.data?.filter((product) => isIn(option, product)).length,
        on: option === view,
        choose: () =>
          update((address) => {
            if (setting) address.set("show", setting);
            else address.delete("show");
            address.delete("page");
          }),
      }))}
    />
  );

  // With no products at all, every view invites the first one rather than saying a filter is empty.
  const filtered = view !== "all" && (products.data?.length ?? 0) > 0;

  return (
    <>
      <PageHeader title="Products">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          Add product
        </button>
      </PageHeader>
      <DataTable
        noun="product"
        rows={rows}
        error={products.error}
        onRetry={() => products.refetch()}
        columns={columns}
        defaultSort={{ id: "name", desc: false }}
        rowId={(row) => row.id}
        rowName={(row) => row.name}
        rowHref={(row) => `/products/${row.id}`}
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        rowAction={{
          label: (row) => `${row.active ? "Archive" : "Restore"} ${row.name}`,
          icon: (row) => (row.active ? <Archive {...ICON} /> : <ArchiveRestore {...ICON} />),
          onClick: (row) => setActive(row, !row.active),
        }}
        filters={filters}
        filtered={filtered}
        emptyFilterMessage={view === "archived" ? "No archived products." : "No active products."}
        clearParams={["show"]}
      />
      {editing && <ProductForm record={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

const ICON = { size: 16, "aria-hidden": true } as const;
