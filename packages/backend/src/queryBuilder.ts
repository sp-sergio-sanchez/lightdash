import {
    CompiledMetricQuery,
    Explore,
    fieldId,
    FieldId,
    FieldReferenceError,
    FilterGroup,
    FilterRule,
    getDimensions,
    getFields,
    getFilterRulesFromGroup,
    getMetrics,
    isAndFilterGroup,
    isFilterGroup,
    parseAllReferences,
    renderFilterRuleSql,
    WarehouseClient,
} from '@lightdash/common';

const getDimensionFromId = (dimId: FieldId, explore: Explore) => {
    const dimensions = getDimensions(explore);
    const dimension = dimensions.find((d) => fieldId(d) === dimId);
    if (dimension === undefined)
        throw new FieldReferenceError(
            `Tried to reference dimension with unknown field id: ${dimId}`,
        );
    return dimension;
};

const getMetricFromId = (
    metricId: FieldId,
    explore: Explore,
    compiledMetricQuery: CompiledMetricQuery,
) => {
    const metrics = [
        ...getMetrics(explore),
        ...(compiledMetricQuery.compiledAdditionalMetrics || []),
    ];
    const metric = metrics.find((m) => fieldId(m) === metricId);
    if (metric === undefined)
        throw new FieldReferenceError(
            `Tried to reference metric with unknown field id: ${metricId}`,
        );
    return metric;
};

const getOperatorSql = (filterGroup: FilterGroup | undefined) => {
    if (filterGroup) {
        return isAndFilterGroup(filterGroup) ? ' AND ' : ' OR ';
    }
    return ' AND ';
};

export type BuildQueryProps = {
    explore: Explore;
    compiledMetricQuery: CompiledMetricQuery;

    warehouseClient: WarehouseClient;
};
export const buildQuery = ({
    explore,
    compiledMetricQuery,
    warehouseClient,
}: BuildQueryProps): { query: string; hasExampleMetric: boolean } => {
    let hasExampleMetric: boolean = false;

    const { dimensions, metrics, filters, sorts, limit } = compiledMetricQuery;
    // por si aca se necesita el nombre de la tabla
    const baseTable = explore.tables[explore.baseTable].sqlTable;
    const fieldQuoteChar = warehouseClient.getFieldQuoteChar();
    const stringQuoteChar = warehouseClient.getStringQuoteChar();
    const escapeStringQuoteChar = warehouseClient.getEscapeStringQuoteChar();
    const startOfWeek = warehouseClient.getStartOfWeek();
    const sqlFrom = `FROM ${baseTable} AS ${fieldQuoteChar}${explore.baseTable}${fieldQuoteChar}`;

    const dimensionSelects = dimensions.map((field) => {
        const alias = field;
        const dimension = getDimensionFromId(field, explore);
        return `${dimension.name}`;
    });

    const metricSelects = metrics.map((field) => {
        const alias = field;
        const metric = getMetricFromId(field, explore, compiledMetricQuery);
        if (metric.isAutoGenerated) {
            hasExampleMetric = true;
        }
        return `${metric.name}`;
    });

    const fieldOrders = sorts.map(
        (sort) =>
            `${sort.descending ? ' -' : ''}${sort.fieldId}`,
    );
    // Enable sorting
    // for (let i = 0; i < fieldOrders.length; i++) {
    //     if (fieldOrders[i] === '-date_day'){
    //         fieldOrders[i] = 'date'
    //     }
    //     else if (fieldOrders[i].includes("date_week") || fieldOrders[i].includes("date_month") || fieldOrders[i].includes("date_year")){
    //         fieldOrders[i] = fieldOrders[i].replace("date_", 'date___')
    //     }
    // }
    const mfOrderBy =
        fieldOrders.length > 0 ? `--order ${fieldOrders.join(',').replace("mvp_metrics_", '')}` : '';

    const sqlFilterRule = (filter: FilterRule) => {
        const field = getFields(explore).find(
            (d) => fieldId(d) === filter.target.fieldId,
        );
        if (!field) {
            throw new Error(
                `Filter has a reference to an unknown dimension: ${filter.target.fieldId}`,
            );
        }
        return renderFilterRuleSql(
            filter,
            field,
            fieldQuoteChar,
            stringQuoteChar,
            escapeStringQuoteChar,
            startOfWeek,
        );
    };

    const getNestedFilterSQLFromGroup = (
        filterGroup: FilterGroup | undefined,
    ): string | undefined => {
        if (filterGroup) {
            const operator = isAndFilterGroup(filterGroup) ? 'AND' : 'OR';
            const items = isAndFilterGroup(filterGroup)
                ? filterGroup.and
                : filterGroup.or;
            if (items.length === 0) return undefined;
            const filterRules: string[] = items.reduce<string[]>(
                (sum, item) => {
                    const filterSql: string | undefined = isFilterGroup(item)
                        ? getNestedFilterSQLFromGroup(item)
                        : ` ${sqlFilterRule(item)} `;
                    return filterSql ? [...sum, filterSql] : sum;
                },
                [],
            );
            return filterRules.length > 0
                ? `(${filterRules.join(` ${operator} `)})`
                : undefined;
        }
        return undefined;
    };

    const nestedFilterSql = getNestedFilterSQLFromGroup(filters.dimensions);
    const sqlWhere =
        filters.dimensions !== undefined && nestedFilterSql
            ? `--where "${nestedFilterSql}"`
            : '';

    const whereMetricFilters = getFilterRulesFromGroup(filters.metrics).map(
        (filter) => {
            const field = getMetricFromId(
                filter.target.fieldId,
                explore,
                compiledMetricQuery,
            );
            if (!field) {
                throw new Error(
                    `Filter has a reference to an unknown metric: ${filter.target.fieldId}`,
                );
            }
            return renderFilterRuleSql(
                filter,
                field,
                fieldQuoteChar,
                stringQuoteChar,
                escapeStringQuoteChar,
                startOfWeek,
            );
        },
    );

    // if (
    //     compiledMetricQuery.compiledTableCalculations.length > 0 ||
    //     whereMetricFilters.length > 0
    // ) {
    //     const finalSqlWhere =
    //         whereMetricFilters.length > 0
    //             ? `WHERE ${whereMetricFilters
    //                   .map((w) => `(\n  ${w}\n)`)
    //                   .join(getOperatorSql(filters.metrics))}`
    //             : '';
    // }
    var clean_dimensions: string[] = [];
    dimensionSelects.forEach((dimension: string) => {
       if (dimension == 'date_day'){
           clean_dimensions.push('date');
       }
       else {
           clean_dimensions.push(dimension);
       }
    });


    const mfCall = `mf query`;
    const mfMetrics = `--metrics ${[...metricSelects].join(',')}`;
    const mfDimensions = `--dimensions ${[...clean_dimensions].join(',')}`;
    const mfOrder = `${mfOrderBy}`;
    const mfWhere = `${sqlWhere}`;
    const mfLimit = `--limit ${limit}`;

    const metricQuerySql = [
        mfCall,
        mfMetrics,
        mfDimensions,
        mfWhere,
        //mfOrder,
        mfLimit
    ].join(' ');
    return {
        query: metricQuerySql,
        hasExampleMetric,
    };
};

