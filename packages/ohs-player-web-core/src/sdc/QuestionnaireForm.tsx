import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Stack, SelectField, TextAreaField, TextField, type SelectFieldOption } from '../ui/primitives';
import {
  buildQuestionnaireResponse,
  validateRequiredAnswers,
} from './buildQuestionnaireResponse';
import type { Questionnaire, QuestionnaireItem } from './questionnaireTypes';

export interface QuestionnaireFormRenderContext {
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  /** Render the default control for this item (respects reference options, etc.). */
  renderDefault: () => ReactElement;
}

/** Avoid infinite sync loops when callers pass a fresh `{ ... }` each render with the same values. */
function answersRecordShallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export interface QuestionnaireFormProps {
  questionnaire: Questionnaire;
  /** Initial answer values keyed by linkId (strings only for controlled state). */
  initialAnswers?: Record<string, string>;
  /** For `reference` items — select options keyed by linkId. */
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
  /** Optional per-item override; return `null`/`undefined` to fall back to default rendering. */
  renderItem?: (
    item: QuestionnaireItem,
    ctx: QuestionnaireFormRenderContext,
  ) => React.ReactNode | null | undefined;
  onAnswersChange?: (answers: Record<string, string>) => void;
}

export function useQuestionnaireFormState(questionnaire: Questionnaire, initialAnswers?: Record<string, string>) {
  const [answers, setAnswersState] = useState<Record<string, string>>(() => ({ ...initialAnswers }));
  const lastAppliedInitialRef = useRef<Record<string, string> | undefined>(
    initialAnswers ? { ...initialAnswers } : undefined,
  );

  useEffect(() => {
    if (!initialAnswers) return;
    if (answersRecordShallowEqual(lastAppliedInitialRef.current ?? {}, initialAnswers)) {
      return;
    }
    lastAppliedInitialRef.current = { ...initialAnswers };
    setAnswersState({ ...initialAnswers });
  }, [initialAnswers]);

  const setAnswer = useCallback((linkId: string, value: string) => {
    setAnswersState((prev) => ({ ...prev, [linkId]: value }));
  }, []);

  const setAnswers = useCallback((next: Record<string, string>) => {
    setAnswersState(next);
  }, []);

  const buildCompletedResponse = useCallback(() => {
    return buildQuestionnaireResponse({
      questionnaire,
      answers,
      status: 'completed',
    });
  }, [questionnaire, answers]);

  const validate = useCallback(() => validateRequiredAnswers(questionnaire, answers), [questionnaire, answers]);

  return {
    answers,
    setAnswer,
    setAnswers,
    buildQuestionnaireResponse: buildCompletedResponse,
    validateRequired: validate,
  };
}

function choiceOptions(item: QuestionnaireItem): SelectFieldOption[] {
  const opts = item.answerOption ?? [];
  const out: SelectFieldOption[] = [];
  for (const o of opts) {
    if (o.valueCoding?.code !== undefined) {
      out.push({
        value: o.valueCoding.code,
        label: o.valueCoding.display ?? o.valueCoding.code,
      });
    } else if (o.valueString !== undefined) {
      out.push({ value: o.valueString, label: o.valueString });
    }
  }
  return out;
}

function LeafField({
  item,
  answers,
  setAnswer,
  referenceOptionsByLinkId,
}: {
  item: QuestionnaireItem;
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
}): ReactElement {
  const linkId = item.linkId;
  const label = item.text ?? linkId;
  const value = answers[linkId] ?? '';
  const required = Boolean(item.required);
  const t = item.type ?? 'string';

  if (t === 'boolean') {
    const opts: SelectFieldOption[] = [
      { value: '', label: '—' },
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ];
    return (
      <SelectField
        name={linkId}
        label={label}
        options={opts}
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  if (t === 'integer' || t === 'decimal') {
    return (
      <TextField
        name={linkId}
        label={label}
        type="number"
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  if (t === 'choice') {
    const opts = choiceOptions(item);
    return (
      <SelectField
        name={linkId}
        label={label}
        options={opts}
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  if (t === 'open-choice') {
    return (
      <TextField
        name={linkId}
        label={label}
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  if (t === 'reference') {
    const opts = referenceOptionsByLinkId?.[linkId];
    if (opts && opts.length > 0) {
      return (
        <SelectField
          name={linkId}
          label={label}
          options={[...opts]}
          value={value}
          onChange={(e) => setAnswer(linkId, e.target.value)}
          required={required}
        />
      );
    }
    return (
      <TextField
        name={linkId}
        label={label}
        placeholder="Resource reference (e.g. Location/123)"
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  if (t === 'text') {
    return (
      <TextAreaField
        name={linkId}
        label={label}
        value={value}
        onChange={(e) => setAnswer(linkId, e.target.value)}
        required={required}
      />
    );
  }

  return (
    <TextField
      name={linkId}
      label={label}
      value={value}
      onChange={(e) => setAnswer(linkId, e.target.value)}
      required={required}
    />
  );
}

function QuestionnaireFieldsInner({
  items,
  answers,
  setAnswer,
  referenceOptionsByLinkId,
  renderItem,
}: {
  items: QuestionnaireItem[];
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
  renderItem?: QuestionnaireFormProps['renderItem'];
}): ReactElement {
  return (
    <Stack gap={3}>
      {items.map((item) => (
        <QuestionnaireItemRow
          key={item.linkId}
          item={item}
          answers={answers}
          setAnswer={setAnswer}
          referenceOptionsByLinkId={referenceOptionsByLinkId}
          renderItem={renderItem}
        />
      ))}
    </Stack>
  );
}

/** Presentational questionnaire fields — pair with {@link useQuestionnaireFormState}. */
export function QuestionnaireFields({
  questionnaire,
  answers,
  setAnswer,
  referenceOptionsByLinkId,
  renderItem,
}: {
  questionnaire: Questionnaire;
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
  renderItem?: QuestionnaireFormProps['renderItem'];
}): ReactElement {
  const topItems = useMemo(() => questionnaire.item ?? [], [questionnaire.item]);
  return (
    <QuestionnaireFieldsInner
      items={topItems}
      answers={answers}
      setAnswer={setAnswer}
      referenceOptionsByLinkId={referenceOptionsByLinkId}
      renderItem={renderItem}
    />
  );
}

function Items({
  items,
  answers,
  setAnswer,
  referenceOptionsByLinkId,
  renderItem,
}: {
  items: QuestionnaireItem[];
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
  renderItem?: QuestionnaireFormProps['renderItem'];
}): ReactElement {
  return (
    <QuestionnaireFieldsInner
      items={items}
      answers={answers}
      setAnswer={setAnswer}
      referenceOptionsByLinkId={referenceOptionsByLinkId}
      renderItem={renderItem}
    />
  );
}

function QuestionnaireItemRow({
  item,
  answers,
  setAnswer,
  referenceOptionsByLinkId,
  renderItem,
}: {
  item: QuestionnaireItem;
  answers: Record<string, string>;
  setAnswer: (linkId: string, value: string) => void;
  referenceOptionsByLinkId?: Record<string, readonly SelectFieldOption[]>;
  renderItem?: QuestionnaireFormProps['renderItem'];
}): ReactElement | null {
  const hasNested = Boolean(item.item?.length);

  if (hasNested) {
    const heading = item.text ? (
      <span style={{ fontWeight: 600 }}>{item.text}</span>
    ) : null;
    const gridCols = item.extension?.find((e) => e.url.endsWith('grid-columns'))?.valueInteger;
    const children = item.item ?? [];
    const childContent =
      gridCols && gridCols > 1 ? (
        <div className="ohs-field-grid" data-columns={String(gridCols)}>
          {children.map((child) => (
            <QuestionnaireItemRow
              key={child.linkId}
              item={child}
              answers={answers}
              setAnswer={setAnswer}
              referenceOptionsByLinkId={referenceOptionsByLinkId}
              renderItem={renderItem}
            />
          ))}
        </div>
      ) : (
        <Items
          items={children}
          answers={answers}
          setAnswer={setAnswer}
          referenceOptionsByLinkId={referenceOptionsByLinkId}
          renderItem={renderItem}
        />
      );
    return (
      <Stack gap={3}>
        {heading}
        {childContent}
      </Stack>
    );
  }

  const defaultRender = (): ReactElement => (
    <LeafField
      item={item}
      answers={answers}
      setAnswer={setAnswer}
      referenceOptionsByLinkId={referenceOptionsByLinkId}
    />
  );

  if (renderItem) {
    const custom = renderItem(item, {
      answers,
      setAnswer,
      renderDefault: defaultRender,
    });
    if (custom !== undefined && custom !== null) {
      return <>{custom}</>;
    }
  }

  return defaultRender();
}

/**
 * Renders a FHIR Questionnaire as a form and manages string-valued answers keyed by linkId.
 *
 * Use {@link buildQuestionnaireResponse} or {@link useQuestionnaireFormState} to produce a `QuestionnaireResponse`.
 */
export function QuestionnaireForm({
  questionnaire,
  initialAnswers,
  referenceOptionsByLinkId,
  renderItem,
  onAnswersChange,
}: QuestionnaireFormProps): ReactElement {
  const { answers, setAnswer } = useQuestionnaireFormState(questionnaire, initialAnswers);

  useEffect(() => {
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  return (
    <QuestionnaireFields
      questionnaire={questionnaire}
      answers={answers}
      setAnswer={setAnswer}
      referenceOptionsByLinkId={referenceOptionsByLinkId}
      renderItem={renderItem}
    />
  );
}
