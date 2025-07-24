import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudUploader - Files",
  description: "Manage your uploaded images across all cloud providers",
};

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 