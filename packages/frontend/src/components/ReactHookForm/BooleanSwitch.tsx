import { Switch } from '@blueprintjs/core';
import React, { FC } from 'react';
import InputWrapper, { InputWrapperProps } from './InputWrapper';

interface Props extends Omit<InputWrapperProps, 'render'> {
    switchProps?: React.ComponentProps<typeof Switch>;
}

const BooleanSwitch: FC<Props> = ({ switchProps, ...rest }) => (
    <InputWrapper
        {...rest}
        render={(props, { field: { ref, value, ...restField } }) => (
            <Switch
                inline
                large
                innerLabelChecked="Yes"
                innerLabel="No"
                {...switchProps}
                checked={value}
                {...props}
                {...restField}
                inputRef={ref}
            />
        )}
    />
);
export default BooleanSwitch;
