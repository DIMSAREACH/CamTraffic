interface OfficerFooterProps {
  text: string;
}

export function OfficerFooter({ text }: OfficerFooterProps) {
  return (
    <footer className="officer-layout__footer-content">
      <p>{text}</p>
    </footer>
  );
}
