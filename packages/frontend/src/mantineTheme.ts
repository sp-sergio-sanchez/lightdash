import { Colors } from '@blueprintjs/core';
import { ColorScheme, MantineThemeOverride, rem } from '@mantine/core';

export const getMantineThemeOverride = (overrides?: {
    colorScheme?: ColorScheme;
}): MantineThemeOverride => ({
    ...overrides,

    black: Colors.DARK_GRAY1,
    white: Colors.WHITE,

    spacing: {
        one: rem(1),
        two: rem(2),
        xxs: rem(4),
        xs: rem(8),
        sm: rem(12),
        md: rem(16),
        lg: rem(20),
        xl: rem(24),
        xxl: rem(32),
        '3xl': rem(40),
        '4xl': rem(48),
        '5xl': rem(64),
        '6xl': rem(80),
        '7xl': rem(96),
        '8xl': rem(128),
        '9xl': rem(160),
    },

    fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Open Sans',
        'Helvetica Neue',
        'blueprint-icons-16',
        'Apple Color Emoji',
        'Segoe UI Emoji',
        'sans-serif',
    ].join(', '),

    lineHeight: 1.2858142857,

    components: {
        TextInput: {
            styles: (theme, _params) => ({
                label: {
                    // FIXME: this is a hack to fix label position. remove after Blueprint migration is complete
                    marginBottom: theme.spacing.xxs,
                },
            }),
        },

        PasswordInput: {
            styles: (theme, _params) => ({
                label: {
                    // FIXME: this is a hack to fix label position. remove after Blueprint migration is complete
                    marginBottom: theme.spacing.xxs,
                },
            }),
        },

        ColorInput: {
            styles: (theme, _params) => ({
                label: {
                    // FIXME: this is a hack to fix label position. remove after Blueprint migration is complete
                    marginBottom: theme.spacing.xxs,
                },
            }),
        },

        Select: {
            styles: (theme, _params) => ({
                label: {
                    // FIXME: this is a hack to fix label position. remove after Blueprint migration is complete
                    marginBottom: theme.spacing.xxs,
                },
            }),
        },

        MultiSelect: {
            styles: (theme, _params) => ({
                label: {
                    // FIXME: this is a hack to fix label position. remove after Blueprint migration is complete
                    marginBottom: theme.spacing.xxs,
                },
            }),
        },

        Kbd: {
            styles: (theme, _params) => ({
                root: {
                    borderBottomWidth: theme.spacing.two,
                },
            }),
        },

        Indicator: {
            styles: () => ({
                // FIXME: this is a hack to fix position of the Indicator under overlays. Remove after Blueprint migration is complete
                root: {
                    zIndex: 20,
                },
            }),
        },

        Tooltip: {
            defaultProps: {
                withArrow: true,
            },
            styles: () => ({
                // FIXME: this is a hack to fix tooltip position. remove after Blueprint migration is complete
                root: {
                    zIndex: 20,
                },
            }),
        },
    },

    globalStyles: (theme) => ({
        'html, body': {
            backgroundColor: theme.colors.gray[0],
        },

        body: {
            textTransform: 'none',
            fontSize: '14px',
        },

        p: {
            marginBottom: '10px',
            marginTop: 0,
        },

        small: {
            fontSize: '12px',
        },

        b: {
            fontWeight: 'bold',
        },

        strong: {
            fontWeight: 600,
        },

        ':focus': {
            outline: 'rgba(45, 114, 210, 0.6) solid 2px',
            outlineOffset: '2px',
            '-moz-outline-radius': '6px',
        },
    }),
});
