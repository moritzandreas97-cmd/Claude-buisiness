interface ProgressDotsProps {
  total: number;
  current: number; // 0-indexed
}

export default function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="progress-dots" role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= current ? "dot dot-filled" : "dot"} />
      ))}
    </div>
  );
}
