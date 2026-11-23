// Opens the record forms and the delete dialog from anywhere: a table row, a
// pipeline column, a record page. One dialog shows at a time.

import { Fragment, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { type DeleteKind, fetchDeleteImpact, useDelete } from '../../api/hooks';
import type { Contact, Deal, Organization, TimelineEntry } from '../../api/types';
import { ACTIVITY_DELETE_BODY, activityDeleteTitle, deleteBody, deleteTitle } from '../../lib/deleteText';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { FormDialog } from '../FormDialog';
import { useToast } from '../Toaster';
import { ActivityForm } from './ActivityForm';
import { ContactForm } from './ContactForm';
import { DealForm } from './DealForm';
import { OrganizationForm } from './OrganizationForm';

type FormRequest =
  | { kind: 'organization'; record?: Organization; onSaved?: (id: number) => void }
  | {
      kind: 'contact';
      record?: Contact;
      defaults?: { organization_id?: number | null };
      onSaved?: (id: number) => void;
    }
  | {
      kind: 'deal';
      record?: Deal;
      defaults?: { stage?: string; organization_id?: number | null; contact_id?: number | null };
      onSaved?: (id: number) => void;
    }
  | { kind: 'activity'; record: TimelineEntry; onSaved?: (id: number) => void };

type DeleteRequest =
  | { kind: DeleteKind; id: number; onDeleted?: () => void }
  | { kind: 'activities'; activity: TimelineEntry; onDeleted?: () => void };

interface FormsApi {
  openForm: (request: FormRequest) => void;
  confirmDelete: (request: DeleteRequest) => void;
}

const FormsContext = createContext<FormsApi>({ openForm: () => {}, confirmDelete: () => {} });

export function useForms() {
  return useContext(FormsContext);
}

const LABEL: Record<DeleteKind | 'activities', string> = {
  organizations: 'Organization',
  contacts: 'Contact',
  deals: 'Deal',
  activities: 'Activity',
};

const TITLE = { organization: 'organization', contact: 'contact', deal: 'deal', activity: 'activity' } as const;

export function FormsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [form, setForm] = useState<FormRequest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState<{ request: DeleteRequest; title: string; body: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteKind, setDeleteKind] = useState<DeleteKind | 'activities'>('deals');
  const remove = useDelete(deleteKind);

  const openForm = useCallback((request: FormRequest) => {
    setForm(request);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }, []);

  const confirmDelete = useCallback(
    async (request: DeleteRequest) => {
      setDeleteKind(request.kind);
      if (request.kind === 'activities') {
        setPending({
          request,
          title: activityDeleteTitle(request.activity.type ?? 'note'),
          body: ACTIVITY_DELETE_BODY,
        });
        setDeleteOpen(true);
        return;
      }
      try {
        // UI-DEL-01: ask what will happen before the dialog appears.
        const impact = await fetchDeleteImpact(request.kind, request.id);
        setPending({ request, title: deleteTitle(impact.name), body: deleteBody(request.kind, impact) });
        setDeleteOpen(true);
      } catch {
        toast(`Couldn't check what deleting would change. Try again.`, 'error');
      }
    },
    [toast],
  );

  const doDelete = async () => {
    if (!pending) return;
    const { request } = pending;
    const id = request.kind === 'activities' ? request.activity.id : request.id;
    try {
      await remove.mutateAsync(id);
      setDeleteOpen(false);
      toast(`${LABEL[request.kind]} deleted`);
      request.onDeleted?.();
    } catch {
      toast(`Couldn't delete the ${LABEL[request.kind].toLowerCase()}. Try again.`, 'error');
    }
  };

  const api = useMemo(() => ({ openForm, confirmDelete }), [openForm, confirmDelete]);
  const close = () => setFormOpen(false);
  const done = (id: number) => {
    setFormOpen(false);
    form?.onSaved?.(id);
  };

  let title = '';
  let body: ReactNode = null;
  if (form) {
    const isEdit = form.kind === 'activity' || !!form.record;
    title = `${isEdit ? 'Edit' : 'New'} ${TITLE[form.kind]}`;
    if (form.kind === 'organization') {
      body = <OrganizationForm organization={form.record} onDone={(saved) => done(saved.id)} onCancel={close} />;
    } else if (form.kind === 'contact') {
      body = (
        <ContactForm
          contact={form.record}
          defaults={form.defaults}
          onDone={(saved) => done(saved.id)}
          onCancel={close}
        />
      );
    } else if (form.kind === 'deal') {
      body = (
        <DealForm deal={form.record} defaults={form.defaults} onDone={(saved) => done(saved.id)} onCancel={close} />
      );
    } else {
      body = <ActivityForm activity={form.record} onDone={() => done(form.record.id)} onCancel={close} />;
    }
  }

  return (
    <FormsContext.Provider value={api}>
      {children}
      <FormDialog open={formOpen} onOpenChange={setFormOpen} title={title}>
        <Fragment key={formKey}>{body}</Fragment>
      </FormDialog>
      <ConfirmDeleteDialog
        open={deleteOpen}
        title={pending?.title ?? ''}
        body={pending?.body ?? ''}
        busy={remove.isPending}
        onConfirm={doDelete}
        onOpenChange={setDeleteOpen}
      />
    </FormsContext.Provider>
  );
}
