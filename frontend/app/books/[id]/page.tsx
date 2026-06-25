import type { Metadata } from "next";
import BookPlayerClient from "./BookPlayerClient";

export const metadata: Metadata = {
  title: "Now Playing",
};

export default function BookPlayerPage() {
  return <BookPlayerClient />;
}
