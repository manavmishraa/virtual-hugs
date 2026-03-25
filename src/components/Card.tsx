interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface border border-surface-border rounded-[14px] p-6 ${className}`}
    >
      {children}
    </div>
  );
}
