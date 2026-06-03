'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
}

export function AlertModal({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-6 w-6 text-red-400" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-400" />;
      default:
        return <Info className="h-6 w-6 text-purple-400" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      classNames={{ backdrop: 'bg-black/50' }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          {getIcon()}
          <span>{title}</span>
        </ModalHeader>
        <ModalBody>
          <p>{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            className="bg-purple-600 font-semibold text-white hover:bg-purple-700"
            onPress={onClose}
          >
            OK
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
