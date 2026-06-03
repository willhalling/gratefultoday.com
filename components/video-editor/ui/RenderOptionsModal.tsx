'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
} from '@heroui/react';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

interface RenderOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: RenderOptions) => void;
  isRendering: boolean;
  renderProgress: number;
  format?: 'mp4' | 'webm';
  fullDuration: number;
}

export interface RenderOptions {
  renderSample: boolean;
  sampleDuration: number;
  useLambda: boolean;
}

export function RenderOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  isRendering,
  renderProgress,
  format = 'mp4',
  fullDuration,
}: RenderOptionsModalProps) {
  const [renderSample, setRenderSample] = useState(false);
  const [useLambda, setUseLambda] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);
  const renderStartTimeRef = useRef<number | null>(null);
  const estimatedTimeRef = useRef<string | null>(null);
  const sampleDuration = 30;

  const handleConfirm = () => {
    onConfirm({ renderSample, sampleDuration, useLambda });
  };

  useEffect(() => {
    if (!isOpen || isRendering) return;
    setRenderSample(false);
    setUseLambda(false);
  }, [isOpen, isRendering]);

  useEffect(() => {
    if (isRendering && !renderStartTimeRef.current) {
      renderStartTimeRef.current = Date.now();
      estimatedTimeRef.current = null;
      setEstimatedTimeRemaining(null);
    } else if (!isRendering && renderStartTimeRef.current) {
      renderStartTimeRef.current = null;
      estimatedTimeRef.current = null;
      setEstimatedTimeRemaining(null);
    }
  }, [isRendering]);

  const updateEstimatedTime = useCallback(() => {
    if (!isRendering || !renderStartTimeRef.current || renderProgress < 15) return;
    const elapsed = Date.now() - renderStartTimeRef.current;
    const progressPercent = renderProgress / 100;
    const totalEstimated = elapsed / progressPercent;
    const remaining = totalEstimated - elapsed;
    const remainingSeconds = Math.ceil(remaining / 1000);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const newTime = mins > 0 ? `~${mins} min ${secs} sec` : `~${secs} sec`;
    if (estimatedTimeRef.current !== newTime) {
      estimatedTimeRef.current = newTime;
      setEstimatedTimeRemaining(newTime);
    }
  }, [renderProgress, isRendering]);

  useEffect(() => {
    updateEstimatedTime();
  }, [updateEstimatedTime]);

  if (isRendering) {
    return (
      <Modal isOpen={isOpen} isDismissable={false} hideCloseButton placement="center">
        <ModalContent className="border border-purple-500/20 bg-black/90">
          <ModalHeader className="flex flex-col gap-1 pb-2">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <span className="text-xl font-semibold text-white">Rendering Your Video</span>
            </div>
          </ModalHeader>
          <ModalBody className="pb-6">
            <p className="mb-4 text-gray-300">
              This may take several minutes depending on the video length and your device's
              processing power.
            </p>
            {format === 'webm' && (
              <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-sm text-blue-300">
                  <strong>Firefox users:</strong> Video will be exported as WebM format (VP8/Opus)
                  for optimal compatibility.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="font-semibold text-purple-400">{renderProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300 ease-out"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Estimated time remaining</span>
                <span className="text-gray-300">{estimatedTimeRemaining || 'Calculating...'}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Please don't close this tab or navigate away...
            </p>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      className="border border-purple-500/20"
    >
      <ModalContent className="bg-black/90">
        <ModalHeader className="flex items-center gap-3">
          <Download className="h-5 w-5 text-purple-400" />
          <span className="text-xl font-semibold text-white">Download Video</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-gray-300 mb-4">Choose your download options:</p>
          <div className="space-y-6">
            <Checkbox
              isSelected={renderSample}
              onValueChange={setRenderSample}
              classNames={{ label: 'text-white' }}
            >
              <div>
                <div className="font-medium">30-Second Sample</div>
                <div className="text-sm text-gray-400">
                  Render only the first 30 seconds for a quick preview
                </div>
              </div>
            </Checkbox>
            <Checkbox
              isSelected={useLambda}
              onValueChange={setUseLambda}
              classNames={{ label: 'text-white' }}
            >
              <div>
                <div className="font-medium">Server Rendering (Recommended for long videos)</div>
                <div className="text-sm text-gray-400">
                  Render on AWS Lambda to avoid browser memory issues.
                </div>
              </div>
            </Checkbox>
            <div className="rounded-lg mt-4 bg-gray-900/50 p-3 border border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Full Duration:</span>
                <span className="text-white font-medium">{formatDuration(fullDuration)}</span>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            className="bg-purple-600 text-white font-semibold hover:bg-purple-700"
            onPress={handleConfirm}
            startContent={<Download className="h-4 w-4" />}
          >
            {' '}
            {renderSample ? 'Render Sample' : 'Render Full Video'}{' '}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
