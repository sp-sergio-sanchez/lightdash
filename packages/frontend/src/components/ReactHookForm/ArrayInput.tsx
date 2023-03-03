import { FormGroup, Icon } from '@blueprintjs/core';
import { ErrorMessage } from '@hookform/error-message';
import React, { useState } from 'react';
import { get, useFieldArray, useFormContext } from 'react-hook-form';
import { UseFieldArrayProps } from 'react-hook-form/dist/types/fieldArray';
import DocumentationHelpButton from '../DocumentationHelpButton';
import { LabelInfoToggleButton } from './FromGroup.styles';

type Props = {
    name: string;
    label: string;
    disabled?: boolean;
    documentationUrl?: string;
    labelHelp?: string | JSX.Element;
    renderRow: (
        key: string,
        index: number,
        remove: ReturnType<typeof useFieldArray>['remove'],
    ) => JSX.Element;
    renderAppendRowButton: (
        append: ReturnType<typeof useFieldArray>['append'],
    ) => JSX.Element;
    rules?: UseFieldArrayProps['rules'];
};
export const ArrayInput = ({
    name,
    label,
    documentationUrl,
    labelHelp,
    renderRow,
    renderAppendRowButton,
    rules,
}: Props) => {
    const {
        control,
        formState: { errors },
    } = useFormContext();
    const { fields, remove, append } = useFieldArray({ name, control, rules });

    const [isLabelInfoOpen, setIsLabelInfoOpen] = useState<boolean>(false);
    const rootFieldName = `${name}.root`;
    const error = get(errors, rootFieldName);

    return (
        <FormGroup
            className="input-wrapper"
            label={label}
            subLabel={isLabelInfoOpen && labelHelp}
            labelInfo={
                <>
                    <span style={{ flex: 1 }}></span>
                    {documentationUrl && !labelHelp && (
                        <DocumentationHelpButton url={documentationUrl} />
                    )}
                    {labelHelp && (
                        <LabelInfoToggleButton
                            onClick={(e) => {
                                e.preventDefault();

                                setIsLabelInfoOpen(!isLabelInfoOpen);
                            }}
                        >
                            <Icon icon="help" intent="none" iconSize={15} />
                        </LabelInfoToggleButton>
                    )}
                </>
            }
            intent={error ? 'danger' : 'none'}
            helperText={
                <ErrorMessage errors={errors} name={rootFieldName} as="p" />
            }
        >
            {fields.map((field, index) => renderRow(field.id, index, remove))}
            {renderAppendRowButton(append)}
        </FormGroup>
    );
};
