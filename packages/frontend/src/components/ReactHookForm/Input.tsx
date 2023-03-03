import { InputGroup } from '@blueprintjs/core';
import React, { FC } from 'react';
import InputWrapper, { InputWrapperProps } from './InputWrapper';

const Input: FC<Omit<InputWrapperProps, 'render'>> = ({ ...rest }) => (
    <InputWrapper
        {...rest}
        render={(props, { field: { ref, ...field } }) => (
            <InputGroup {...props} {...rest} inputRef={ref} />
        )}
    />
);

export default Input;
