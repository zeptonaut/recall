import Image from 'next/image';

/** Recall app logo - triangular ribbon in teal, green, and yellow. */
export function RecallLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/recall-logo.png"
      alt="Recall logo"
      width={size}
      height={size}
    />
  );
}
