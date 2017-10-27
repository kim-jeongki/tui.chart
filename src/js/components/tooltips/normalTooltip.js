/**
 * @fileoverview NormalTooltip component.
 * @author NHN Ent.
 *         FE Development Lab <dl_javascript@nhnent.com>
 */

'use strict';

var TooltipBase = require('./tooltipBase');
var singleTooltipMixer = require('./singleTooltipMixer');
var chartConst = require('../../const');
var predicate = require('../../helpers/predicate');
var tooltipTemplate = require('./tooltipTemplate');

/**
 * @classdesc NormalTooltip component.
 * @class NormalTooltip
 * @private
 */
var NormalTooltip = tui.util.defineClass(TooltipBase, /** @lends NormalTooltip.prototype */ {
    /**
     * NormalTooltip component.
     * @constructs NormalTooltip
     * @private
     * @override
     */
    init: function() {
        TooltipBase.apply(this, arguments);
    },

    /**
     * Make tooltip html.
     * @param {string} category category
     * @param {{value: string, legend: string, chartType: string, suffix: ?string}} item item data
     * @returns {string} tooltip html
     * @private
     */
    _makeTooltipHtml: function(category, item) {
        var isPieOrPieDonutComboChart = predicate.isPieChart(this.chartType)
            || predicate.isPieDonutComboChart(this.chartType, this.chartTypes);
        var template;

        if (predicate.isBoxplotChart(this.chartType)) {
            if (tui.util.isNumber(item.outlierIndex)) {
                template = tooltipTemplate.tplBoxplotChartOutlier;
                item.label = item.outliers[item.outlierIndex].label;
            } else {
                template = tooltipTemplate.tplBoxplotChartDefault;
            }
        } else if (isPieOrPieDonutComboChart) {
            template = tooltipTemplate.tplPieChart;
        } else if (this.dataProcessor.coordinateType) {
            template = tooltipTemplate.tplCoordinatetypeChart;
        } else {
            template = tooltipTemplate.tplDefault;
        }

        return template(tui.util.extend({
            categoryVisible: category ? 'show' : 'hide',
            category: category
        }, item));
    },

    /**
     * Make html for value types like x, y, r
     * @param {{x: ?number, y: ?number, r: ?number}} data - data
     * @param {Array.<string>} valueTypes - types of value
     * @returns {string}
     * @private
     */
    _makeHtmlForValueTypes: function(data, valueTypes) {
        return tui.util.map(valueTypes, function(type) {
            return (data[type]) ? '<div>' + type + ': ' + data[type] + '</div>' : '';
        }).join('');
    },

    /**
     * Make single tooltip html.
     * @param {string} chartType chart type
     * @param {{groupIndex: number, index: number}} indexes indexes
     * @returns {string} tooltip html
     * @private
     */
    _makeSingleTooltipHtml: function(chartType, indexes) {
        var groupIndex = indexes.groupIndex;
        var data = tui.util.extend({}, tui.util.pick(this.data, chartType, indexes.groupIndex, indexes.index));

        if (predicate.isBoxplotChart(this.chartType) && tui.util.isNumber(indexes.outlierIndex)) {
            data.outlierIndex = indexes.outlierIndex;
        }

        data = tui.util.extend({
            suffix: this.suffix
        }, data);
        data.valueTypes = this._makeHtmlForValueTypes(data, ['x', 'y', 'r']);

        return this.templateFunc(data.category, data, this.getRawCategory(groupIndex));
    },

    /**
     * Set default align option of tooltip.
     * @private
     * @override
     */
    _setDefaultTooltipPositionOption: function() {
        if (this.options.align) {
            return;
        }

        if (this.isVertical) {
            this.options.align = chartConst.TOOLTIP_DEFAULT_ALIGN_OPTION;
        } else {
            this.options.align = chartConst.TOOLTIP_DEFAULT_HORIZONTAL_ALIGN_OPTION;
        }
    },

    /**
     * Make parameters for show tooltip user event.
     * @param {{groupIndex: number, index: number}} indexes indexes
     * @param {object} additionParams addition parameters
     * @returns {{chartType: string, legend: string, legendIndex: number, index: number}} parameters for show tooltip
     * @private
     */
    _makeShowTooltipParams: function(indexes, additionParams) {
        var legendIndex = indexes.index;
        var legendData = this.dataProcessor.getLegendItem(legendIndex);
        var params;

        if (!legendData) {
            return null;
        }

        params = tui.util.extend({
            chartType: legendData.chartType,
            legend: legendData.label,
            legendIndex: legendIndex,
            index: indexes.groupIndex
        }, additionParams);

        return params;
    },

    /**
     * Make tooltip datum.
     * @param {string} legendLabel - legend label
     * @param {string} category - category
     * @param {SeriesItem} seriesItem - SeriesItem
     * @returns {Object}
     * @private
     */
    _makeTooltipDatum: function(legendLabel, category, seriesItem) {
        var labelPrefix = (legendLabel && seriesItem.label) ? ':&nbsp;' : '';
        var tooltipLabel = seriesItem.tooltipLabel;
        var labelFormatter = this.labelFormatter;
        var tooltipDatum = {
            legend: (legendLabel || '')
        };

        tooltipDatum.label = tooltipLabel || (seriesItem.label ? labelPrefix + seriesItem.label : '');

        if (labelFormatter) {
            tooltipDatum = labelFormatter(seriesItem, tooltipDatum, labelPrefix);
        }

        tooltipDatum.category = category || '';

        return tui.util.extend(tooltipDatum, seriesItem.pickValueMapForTooltip());
    },

    /**
     * Make tooltip data.
     * @returns {Array.<object>} tooltip data
     * @override
     */
    makeTooltipData: function() {
        var self = this;
        var orgLegendLabels = this.dataProcessor.getLegendLabels();
        var isPivot = predicate.isTreemapChart(this.chartType);
        var legendLabels = {};
        var tooltipData = {};

        if (tui.util.isArray(orgLegendLabels)) {
            legendLabels[this.chartType] = orgLegendLabels;
        } else {
            legendLabels = orgLegendLabels;
        }

        this.dataProcessor.eachBySeriesGroup(function(seriesGroup, groupIndex, chartType) {
            var data;

            chartType = chartType || self.chartType;

            data = seriesGroup.map(function(seriesItem, index) {
                var category = self.dataProcessor.makeTooltipCategory(groupIndex, index, self.isVertical);

                return seriesItem ? self._makeTooltipDatum(legendLabels[chartType][index], category, seriesItem) : null;
            });

            if (!tooltipData[chartType]) {
                tooltipData[chartType] = [];
            }

            tooltipData[chartType].push(data);
        }, isPivot);

        return tooltipData;
    }
});

singleTooltipMixer.mixin(NormalTooltip);

function normalTooltipFactory(params) {
    return new NormalTooltip(params);
}

normalTooltipFactory.componentType = 'tooltip';
normalTooltipFactory.NormalTooltip = NormalTooltip;

module.exports = normalTooltipFactory;
