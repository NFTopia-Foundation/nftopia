export type VaultState = "locked" | "unlocking" | "open";

export interface VaultProps {
  initialStatus?: VaultState;
  onStateChange?: (state: VaultState) => void;
}

export interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
}
