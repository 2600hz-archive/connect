winkstart.module('connect', 'credits', {
        css: [
            'css/credits.css'
        ],

        templates: {
            credits: 'tmpl/credits.html',
            credits_dialog: 'tmpl/credits_popup.html'
            //credits_dialog: 'tmpl/credits_dialog.html'
        },

        subscribe: {
            'credits.render': 'render_credits',
            'credits.render_dialog': 'render_credits_dialog',
            'trunkstore.rendered': 'after_trunkstore_render'
        },

        resources: {
            'credits.update': {
                url: '{api_url}/accounts/{account_id}/{billing_provider}/credits',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'credits.get': {
                url: '{api_url}/accounts/{account_id}/{billing_provider}/credits',
                contentType: 'application/json',
                trigger_events: false,
                verb: 'GET'
            }
        }
    },

    function() {
        var THIS = this;

        winkstart.registerResources(THIS.__whapp, THIS.config.resources);
    },

    {
        add_credits: function(credits, success, error) {
            var THIS = this;

            winkstart.request(true, 'credits.update', {
                    account_id: winkstart.apps['connect'].account_id,
                    api_url: winkstart.apps['connect'].api_url,
                    billing_provider: winkstart.apps['connect'].billing_provider,
                    data: {
                        'amount': credits
                    }
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        success(data, status);
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        get_credits: function(success, error) {
            var THIS = this;

            winkstart.request(true, 'credits.get', {
                    account_id: winkstart.apps['connect'].account_id,
                    api_url: winkstart.apps['connect'].api_url,
                    billing_provider: winkstart.apps['connect'].billing_provider
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        success(data, status);
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        /* Condition is a function that specifies when the polling should stop (true = continue, false = stop) */
        poll_credits: function(condition, success, error) {
            var THIS = this,
                polling_interval = 30,
                err = 0,
                poll = function(data) {
                    var ret = condition();

                    if(!ret) {
                        return false;
                    }

                    THIS.get_credits(function(data, status) {
                            if(typeof success == 'function') {
                                success(data, status);
                            }

                            setTimeout(poll, polling_interval * 1000);
                        },
                        function(data, status) {
                            if(err++ < 3) {
                                setTimeout(poll, polling_interval * 1000);
                            }
                            else {
                                if(typeof error == 'function') {
                                    error(data, status);
                                }
                            }
                        }
                    );
                };

            poll();
        },

        render_credits_dialog: function(data, parent, callback) {
            var THIS = this;

            THIS.get_credits(function(_data, status) {
                /* Update of the prepay value from braintree */
                data.account.credits.prepay = _data.data.amount;

                var popup_html = THIS.templates.credits_dialog.tmpl(data),
                    popup;

                $('ul.settings1', popup_html).tabs($('.pane > div', popup_html));

                $('.purchase_credits', popup_html).click(function(ev) {
                    ev.preventDefault();
                    var credits_to_add = parseFloat($('#add_credits', popup_html).val().replace(',','.'));

                    THIS.add_credits(credits_to_add, function() {
                        THIS.get_credits(function(_data) {
                            $('.current_balance', popup_html).empty()
                                                             .text(_data.data.amount);

                            $('.amount', parent).empty().html('$'+_data.data.amount);

                            if(typeof callback === 'function') {
                                callback(_data);
                            }
                        });
                    });
                });

                $('.submit_channels', popup_html).click(function(ev) {
                    ev.preventDefault();

                    var channels_data = {
                        trunks: $('#outbound_calls', popup_html).val(),
                        inbound_trunks: $('#inbound_calls', popup_html).val()
                    };

                    winkstart.publish('channels.update', channels_data, data, function(_data) {
                        popup.dialog('close');

                        $('.inbound_trunks', parent).html(_data.data.account.inbound_trunks);
                        $('.outbound_trunks', parent).html(_data.data.account.trunks);

                        if(typeof callback == 'function') {
                            callback(_data);
                        }
                    });
                });

                popup = winkstart.dialog(popup_html, { title: 'Add Credits' });
            });
        },

        render_credits: function(data, parent) {
            var THIS = this,
                target = $('#credits', parent),
                credits_html = THIS.templates.credits.tmpl(data);

            (target)
                .empty()
                .append(credits_html);
        },

        after_trunkstore_render: function(data, parent) {
            var THIS = this,
                target = $('#credits', parent);

            THIS.poll_credits(function() {
                    return (target.parents('body').size() != 0);
                },
                function(_data) {
                    $.extend(true, data, {
                        account: {
                            credits: {
                                prepay: _data.data.amount
                            }
                        }
                    });

                    THIS.render_credits(data, parent);
                }
            );
        }
    }
);
