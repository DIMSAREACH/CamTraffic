interface DriverFooterProps {
  text: string;
}

export function DriverFooter({ text }: DriverFooterProps) {
  return (
    <footer className="driver-layout__footer-content">
      <p>{text}</p>
    </footer>
  );
}
