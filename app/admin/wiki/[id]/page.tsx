import { notFound } from "next/navigation";
import { getWikiPage } from "@/lib/qa/wiki";
import { WikiEditor } from "./editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WikiEditPage({ params }: PageProps) {
  const { id } = await params;
  const page = await getWikiPage(id);
  if (!page) notFound();

  return (
    <WikiEditor
      initialPage={{
        id: page.id,
        kbType: page.kbType,
        slug: page.slug,
        title: page.title,
        content: page.content,
        version: page.version,
      }}
    />
  );
}
