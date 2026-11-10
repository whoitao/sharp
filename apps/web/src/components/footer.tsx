export function Footer({
  siteName = "Sharp",
  siteUrl = "https://sharp.whoitao.top",
  icpNumber = null,
}: {
  siteName?: string;
  siteUrl?: string;
  icpNumber?: string | null;
}) {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto flex max-w-[1200px] flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <div>
          Copyright © 2026-present{" "}
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {siteName}
          </a>
        </div>
        {icpNumber ? (
          <a
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            {icpNumber}
          </a>
        ) : null}
      </div>
    </footer>
  );
}
