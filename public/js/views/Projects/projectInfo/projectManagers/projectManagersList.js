define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Projects/projectInfo/managers/managersTemplate.html',
    'text!templates/Projects/projectInfo/managers/updateManager.html',
    'views/selectView/selectView',
    'common',
    'dataService',
    'moment'
], function (Backbone, $, _, managersTemplate, updateManager, SelectView, common, dataService, moment) {
    'use strict';

    var PMView = Backbone.View.extend({

        initialize: function (options) {
            this.model = options.model;
            this.responseObj = {};
            this.modelJSON = this.model.id ? this.model.toJSON() : this.model;
        },

        template: _.template(managersTemplate),

        events: {
            'click'                                            : 'hideNewSelect',
            'click .newSelectList li:not(.miniStylePagination)': 'chooseOption',
            'click a.current-selected'                         : 'showNewSelect',
            'click #addManager'                                : 'addManager',
            'click .editable'                                  : 'editNewRow',
            'click .fa-trash'                                  : 'removeManager'
        },

        editLastPM: function () {
            var table = this.$el.find('#projectManagersTable');
            var trs = table.find('tr');
            var removeBtn = '<a href="javascript;" class="fa fa-trash"></a>';
            var lastPM;

            trs.find('td:first-child').text('');

            if (trs.length > 1){
                trs.last().find('td').first().html(removeBtn);
                trs.last().find('.startDateManager').addClass('editable');
            }

            lastPM = trs.last().find('td').last().text();
            trs.last().find('td').last().html('<a id="employee" class="current-selected" href="javascript:;">' + lastPM +'</a>');
        },

        editNewRow: function (e) {
            var target = $(e.target);
            var row = target.parent('tr');
            var prevRow = row.prev().find('.startDateManager');
            var prevSalesDate = prevRow.text() === 'From start of project' ? this.model.get('StartDate') : row.prev().find('.startDateManager').text();
            var prevDate = new Date(prevSalesDate);
            var nextDay = moment(prevDate).add(1, 'd');
            var startDate = common.utcDateToLocaleDate(nextDay.toDate());
            var text;

            if (target.prop('tagName') !== 'INPUT') {
                this.hideNewSelect();
            }
            text = (target.text()).trim();

            target.html('<input class="extrainfo" type="text" name="date" id="date" value="' + text + '" readonly="" placeholder="Date">');

            this.$el.find('#date').datepicker({
                dateFormat : 'd M, yy',
                changeMonth: true,
                changeYear : true,
                minDate    : startDate ,
                onSelect   : function (dateText) {
                    var $editedCol = target.closest('td');
                    var date = new Date(dateText);
                    var prevDay = moment(date).subtract(1, 'd');
                    var $prSmEndDate = target.closest('tr').prev().find('.endDateManager');
                    $editedCol.text(dateText);
                    $prSmEndDate.text(common.utcDateToLocaleDate(prevDay.toDate()));
                    $('#top-bar-saveBtn').show();
                }
            });

            this.$el.find('#date').datepicker('show');

            return false;
        },

        hideNewSelect: function () {
            var $editedDate = this.$el.find('.extrainfo');
            var $editedCol = $editedDate.closest('td');

            $editedCol.text($editedDate.val());
            $('.newSelectList').hide();

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        showNewSelect: function (e) {
            var $target = $(e.target);
            e.stopPropagation();

            if ($target.attr('id') === 'selectInput') {
                return false;
            }

            if (this.selectView) {
                this.selectView.remove();
            }
            if (Object.keys(this.responseObj).length) {
                this.selectView = new SelectView({
                    e          : e,
                    responseObj: this.responseObj
                });
                $target.append(this.selectView.render().el);
            }

            return false;
        },

        chooseOption: function (e) {
            var target = $(e.target);
            var targetElement = target.parents('td');
            var targetRow = target.parents('tr');
            var id = target.attr('id');
            var prevSales = targetRow.prev().attr('data-id');
            var selectorContainer;

            if (prevSales === id) {
                return App.render({
                    type   : 'error',
                    message: 'Please choose another Project Manager'
                });
            }

            targetRow.attr('data-id', id);
            selectorContainer = targetElement.find('a.current-selected');

            selectorContainer.text(target.text());
            $('#top-bar-saveBtn').show();

            this.hideNewSelect();

            return false;
        },

        addManager: function (e) {
            var employeeSelect = this.$el.find('.current-selected');
            var newElements = this.$el.find('[data-id="false"]');
            var startD = this.$el.find('.startDateManager').last();
            e.preventDefault();


            if (newElements.length) {
                return App.render({
                    type   : 'error',
                    message: 'Please select Project Manager first.'
                });
            }

            if (startD.text() === 'Choose Date') {
                return App.render({
                    type   : 'error',
                    message: 'Please, choose Date first.'
                });
            }

            if (employeeSelect.length) {
                this.$el.find('.editable').removeClass('editable');
                employeeSelect.parent('td').text(employeeSelect.text());
                employeeSelect.remove();
            }

            this.$el.find('#projectManagersTable .endDateManager').last().text('');
            this.$el.find('#projectManagersTable').append(_.template(updateManager));


            $('#top-bar-saveBtn').show();
            this.editLastPM();
        },

        removeManager: function (e) {
            var target = $(e.target);
            var row = target.closest('tr');

            e.preventDefault();
            row.prev().find('.endDateManager').text('To end of project');
            row.remove();
            $('#top-bar-saveBtn').show();

            this.editLastPM();
        },

        render: function () {
            var self = this;
            var projectManagers = this.model.get('projectManagers');

            self.$el.html(this.template({
                managers           : projectManagers,
                utcDateToLocaleDate: common.utcDateToLocaleDate,
                PM                 : true
            }));

            dataService.getData('/employee/getForDD', {salesDepartments: true, isEmployee: true}, function (employees) {
                employees = _.map(employees.data, function (employee) {
                    employee.name = employee.name.first + ' ' + employee.name.last;

                    return employee;
                });

                self.responseObj['#employee'] = employees;
            });

            this.editLastPM();

            return this;
        }
    });

    return PMView;
});