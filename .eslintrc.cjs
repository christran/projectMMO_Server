module.exports = {
	parser: '@babel/eslint-parser',
	parserOptions: {
		requireConfigFile: false,
		babelOptions: {
			plugins: [
				'@babel/plugin-syntax-import-assertions'
			],
		},
	},
	// extends: 'airbnb',
	rules: {
		indent: [2, 'tab'],
		'no-tabs': 0,
		'no-console': 'off',
		'global-require': 'off',
		'import/no-dynamic-require': 'off',
		'no-underscore-dangle': 'off',
		'no-shadow': 'off',
		'no-param-reassign': [2, { props: false }],
		'comma-dangle': 'off',
		'max-len': 'off',
		'arrow-body-style': 'off',
		'import/extensions': 'off',
		'prefer-promise-reject-errors': 'off'
	}
};
