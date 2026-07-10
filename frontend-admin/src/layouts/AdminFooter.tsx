interface AdminFooterProps {
  text: string;
}

export function AdminFooter({ text }: AdminFooterProps) {
  return (
    <footer className="admin-layout__footer-content">
      <p>{text}</p>
    </footer>
  );
}
