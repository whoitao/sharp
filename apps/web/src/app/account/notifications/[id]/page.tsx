import { NotificationDetail } from "@/components/account/notification-detail";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function NotificationDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="py-16" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: PageProps) {
  const { id } = await params;
  return <NotificationDetail id={id} />;
}
