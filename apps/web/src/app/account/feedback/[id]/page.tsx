import { FeedbackDetailPanel } from "@/components/account/feedback-detail-panel";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackDetailPanel id={id} />;
}
