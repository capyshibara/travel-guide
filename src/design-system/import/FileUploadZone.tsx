import { useId, useRef, useState, type DragEvent } from 'react';
import styles from './import.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';

export interface FileUploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop plus tap-to-browse.
 *
 * A real `<input type="file">` sits behind the zone, so keyboard and assistive tech
 * get the platform's own file picker; the drop handling is layered on top of it.
 */
export function FileUploadZone({ onFile, disabled }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files.item(0);
    if (file) onFile(file);
  };

  return (
    <label
      htmlFor={id}
      className={cx(styles.dropZone, dragging && styles.dropZoneActive)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
        className={styles.dropInput}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) onFile(file);
          // Reset so re-picking the same file fires change again.
          event.target.value = '';
        }}
      />
      <Icon name="upload-cloud" size="xl" />
      <p className={styles.dropTitle}>Drop your workbook here</p>
      <span className={styles.dropHint}>or tap to browse · .xlsx, .xlsm up to 20 MB</span>
    </label>
  );
}
