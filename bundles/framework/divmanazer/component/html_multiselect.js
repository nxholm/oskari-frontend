/**
 * @class Oskari.userinterface.component.HtmlMultiselect
  */
Oskari.clazz.define('Oskari.userinterface.component.HtmlMultiselect',

    function () {
        this.multiselect = '<div class="oskari-html-multiselect">' +
                                '<select multiple></select>' +
                            '</div>';
        
        this.element = null;
        this.selectedTexts = null;
    },
    {
        getArrayFromOptions: function (options) {
            var arr = [];
            if (options) {
                options.forEach(function (option) {
                    arr.push({
                        name: option.name,
                        value: option.id
                    });
                });
            }
            return arr;
        },
        getValue: function () {
            var array = [];
            var select = this.getElement().find('select')[0];
            for (var i = 0; i < select.length; i++) {
                if (select[i].selected) {
                    array.push(select[i].value);
                }
            }
            return array;
        },
        create: function (options, placeholder) {
            var abstractDiv = jQuery(this.multiselect);
            var abstractSelect = abstractDiv.find('select')[0];
            var arr = this.getArrayFromOptions(options);
            var dragged = [];
            var pressed = false;
            var selectedText = '';

            var divRep = document.createElement('DIV');
            divRep.setAttribute('class', 'oskari-select-selected');
            divRep.textContent = placeholder;

            divRep.addEventListener('click', function (e) {
                e.stopPropagation();
                this.nextSibling.classList.toggle('select-hide');
            });

            var selectedDivList = document.createElement('DIV');
            selectedDivList.setAttribute('class', 'select-items select-hide oskari-html-unselectable');
            selectedDivList.setAttribute('multiple', 'true');
            selectedDivList.addEventListener('mousedown', function (e) {
                dragged = [];
                pressed = true;
            });
            selectedDivList.addEventListener('mouseup', function (e) {
                dragged.forEach(function (item) {
                    item.setAttribute('selected', true);
                });
                pressed = false;
            });
            if (arr.length === 0) {
                return;
            }
            // fill underlying select
            arr.forEach(function (option) {
                var opt = document.createElement('OPTION');
                opt.textContent = option.name;
                opt.value = option.value;
                abstractSelect.append(opt);
            });

            for (var i = 0; i < abstractSelect.length; i++) {
                var optionRepresentation = document.createElement('DIV');
                optionRepresentation.innerHTML = abstractSelect[i].innerHTML;
                optionRepresentation.setAttribute('value', abstractSelect[i].value);

                optionRepresentation.addEventListener('click', function (e) {
                    for (var j = 0; j < abstractSelect.length; j++) {
                        if (abstractSelect[j].value === this.getAttribute('value')) {
                            abstractSelect[j].selected = !abstractSelect[j].selected;
                        }
                    }
                    e.target.classList.toggle('test');
                    if (selectedText === '') {
                        this.selectedText = selectedText.concat(this.textContent);
                    } else {
                        this.selectedText = selectedText.concat(',', this.textContent);
                    }
                    divRep.textContent = this.selectedText;
                });

                optionRepresentation.addEventListener('mouseenter', function (e) {
                    if (!pressed) { return; }
                    dragged.push(e.target);
                    e.target.setAttribute('class', 'test');
                });
                selectedDivList.appendChild(optionRepresentation);
            }
            abstractDiv[0].appendChild(divRep);
            abstractDiv[0].appendChild(selectedDivList);
            this.element = abstractDiv;
        },
        getElement: function () {
            return this.element;
        }
    });
