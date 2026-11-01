import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/studio/ProjectView";
import { getAuth } from "@/lib/auth";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getAuth();
  const project = await getStore().getProject(id);
  if (!project || project.userId !== user.id) notFound();

  return <ProjectView initialProject={project} />;
}
