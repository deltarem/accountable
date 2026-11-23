import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '../../api/client';
import { useToast } from '../Toaster';

/**
 * Saves through a mutation. A 422 puts each message on its field and focuses
 * the first; any other failure shows "Couldn't save the deal. Try again." and
 * leaves the form open with everything typed (UI-ERR-01).
 */
export function useSubmit<TForm extends FieldValues>(thing: string, setError: UseFormSetError<TForm>) {
  const toast = useToast();
  return async function submit<T>(save: () => Promise<T>, onSaved: (result: T) => void) {
    try {
      const result = await save();
      toast(`${thing[0].toUpperCase()}${thing.slice(1)} saved`);
      onSaved(result);
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        const entries = Object.entries(error.fieldErrors);
        entries.forEach(([field, message], i) => {
          setError(field as Path<TForm>, { type: 'server', message }, { shouldFocus: i === 0 });
        });
        return;
      }
      toast(`Couldn't save the ${thing}. Try again.`, 'error');
    }
  };
}
