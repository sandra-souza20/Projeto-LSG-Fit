import { ConfirmModal } from '@/components/confirm-modal';

type ConfirmLogoutModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmLogoutModal({ visible, onCancel, onConfirm }: ConfirmLogoutModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="Sair da conta"
      message="Tem certeza que deseja sair do aplicativo?"
      confirmLabel="Sair"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
