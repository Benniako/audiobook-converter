import type { Metadata } from "next";
import UploadClient from "./UploadClient";

export const metadata: Metadata = {
  title: "Upload a Book",
};

export default function UploadPage() {
  return <UploadClient />;
}
