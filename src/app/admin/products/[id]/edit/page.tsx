import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminShell title="Edit Product">
      <ProductForm productId={id} />
    </AdminShell>
  );
}
