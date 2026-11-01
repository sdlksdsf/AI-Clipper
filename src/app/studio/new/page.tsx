import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/studio/NewProjectForm";

export const metadata = { title: "New project" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-[12px] text-fog transition hover:text-snow"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> All projects
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight sm:text-[30px]">New project</h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-fog">
            Drop in a link and choose how you want the clips to come back. You can fine-tune every
            clip after the analysis.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <NewProjectForm initialUrl={params.url ?? ""} />
      </div>
    </main>
  );
}
