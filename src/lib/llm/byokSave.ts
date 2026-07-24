export async function saveAndCloseByok<T>(
  config: T,
  onSave: (value: T) => Promise<void>,
  onClose: () => void
): Promise<string | null> {
  try {
    await onSave(config);
    onClose();
    return null;
  } catch (error) {
    return error instanceof Error && error.message
      ? error.message
      : 'AI settings could not be saved. Please try again.';
  }
}
