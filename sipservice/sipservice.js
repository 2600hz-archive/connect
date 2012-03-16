winkstart.module('connect', 'sipservice', {
        css: [
            'css/sipservice.css',
            'css/style.css',
            'css/popups.css'
        ],

        templates: {
            signup: 'tmpl/signup.html',
            main: 'tmpl/main.html',
            main_services : 'tmpl/main_services.html'
        },

        subscribe: {
            'trunkstore.refresh': 'render_trunkstore',
            'sipservice.activate' : 'activate'
        },

        resources: {
            'baseaccount.get': {
                url: '{api_url}/accounts/{account_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'trunkstore.create': {
                url: '{api_url}/accounts/{account_id}/connectivity',
                contentType: 'application/json',
                verb: 'PUT'
            },

            'trunkstore.list': {
                url: '{api_url}/accounts/{account_id}/connectivity',
                contentType: 'application/json',
                verb: 'GET'
            },

            'trunkstore.get': {
                url: '{api_url}/accounts/{account_id}/connectivity/{connectivity_id}',
                contentType: 'application/json',
                verb: 'GET'
            },

            'trunkstore.update': {
                url: '{api_url}/accounts/{account_id}/connectivity/{connectivity_id}',
                contentType: 'application/json',
                verb: 'POST'
            },
        }
    },

    function(args) {
        var THIS = this;

        winkstart.registerResources(THIS.__whapp, THIS.config.resources);
    },

    {
        create_account: function(success, error) {
            var THIS = this,
                account_data = {
                    account: {
                        credits: {
                            prepay: '0.00'
                        },
                        trunks: '0',
                        inbound_trunks: '0'
                    },
                    billing_account_id: winkstart.apps['connect'].account_id,
                    DIDs_Unassigned: {},
                    servers: [{
                        server_name: 'Hosted Platform',
                        DIDs: {},
                        auth: {},
                        options: {
                            enabled: true,
                            inbound_format: 'e.164',
                            international: false,
                            caller_id: {},
                            e911_info: {},
                            failover: {}
                        },
                        permissions: {
                            users: []
                        },
                        monitor: {
                            monitor_enabled: false
                        },
                        not_editable: true
                    }]
                };

            winkstart.request(true, 'trunkstore.create', {
                    account_id: winkstart.apps['connect'].account_id,
                    api_url: winkstart.apps['connect'].api_url,
                    data: account_data
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

        get_account: function(success, error) {
            var THIS = this;

            winkstart.request(true, 'trunkstore.get', {
                    account_id: winkstart.apps['connect'].account_id,
                    api_url: winkstart.apps['connect'].api_url,
                    connectivity_id: winkstart.apps['connect'].connectivity_id
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        THIS.check_account_validity(data.data, function(new_data, new_status) {
                            success(new_data || data, new_status || status);
                        });
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        list_accounts: function(success, error) {
            var THIS = this;

            winkstart.request(true, 'trunkstore.list', {
                    account_id: winkstart.apps['connect'].account_id,
                    api_url: winkstart.apps['connect'].api_url
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

        check_account_validity: function(account_data, callback) {
            var change = false,
                update_account = function(req_data, success, error) {
                    winkstart.request(true, 'trunkstore.update', {
                            account_id: winkstart.apps['connect'].account_id,
                            api_url: winkstart.apps['connect'].api_url,
                            connectivity_id: winkstart.apps['connect'].connectivity_id,
                            data: req_data
                        },
                        function(_data, status) {
                            if(typeof success == 'function') {
                                success(_data, status);
                            }
                        },
                        function(_data, status) {
                            if(typeof error == 'function') {
                                error(_data, status);
                            }
                        }
                    );
                };

            if(!('DIDs_Unassigned' in account_data)) {
                account_data.DIDs_Unassigned = {};
                change = true;
            }
            if(!account_data.servers) {
                account_data.servers = [{
                    server_name: '2600hz Platform',
                    DIDs: {},
                    auth: {},
                    options: {
                        enabled: true,
                        inbound_format: 'e.164',
                        international: false,
                        caller_id: {},
                        e911_info: {},
                        failover: {}
                    },
                    permissions: {
                        users: []
                    },
                    monitor: {
                        monitor_enabled: false
                    },
                    not_editable: true
                }];
                change = true;
            }
            if(!('type' in account_data)) {
                account_data.type = 'sys_info';
                change = true;
            }

            if(!change) {
                callback();
            }
            else if(!('auth_realm' in account_data.account)) {
                winkstart.request('baseaccount.get', {
                        account_id: winkstart.apps['connect'].account_id,
                        api_url: winkstart.apps['connect'].api_url
                    },
                    function(data, status) {
                        account_data.account.auth_realm = data.data.realm;
                        update_account(account_data, function(_data, status) {
                            callback(_data, status);
                        });
                    }
                );
            }
            else {
                update_account(account_data, function(_data, status) {
                    callback(_data, status);
                });
            }
        },

        render_trunkstore: function(data, _parent) {
            var THIS = this,
                parent = _parent || $('#ws-content'),
                trunkstore_html = THIS.templates.main.tmpl();

            THIS.templates.main_services.tmpl().appendTo($('#my_services', trunkstore_html));

            winkstart.publish('credits.render', data, trunkstore_html);
            winkstart.publish('channels.render', data, trunkstore_html);
            winkstart.publish('endpoints.render', data, trunkstore_html);
            winkstart.publish('numbers.render', data, trunkstore_html);

            (parent)
                .empty()
                .append(trunkstore_html);

            winkstart.publish('trunkstore.rendered', data, trunkstore_html);
        },

        render_signup: function(_parent) {
            var THIS = this,
                parent = _parent || $('#ws-content'),
                signup_html = THIS.templates.signup.tmpl();

            $('#signup_button', signup_html).click(function(ev) {
                ev.preventDefault();

                THIS.create_account(function(_data) {
                        winkstart.apps['connect'].connectivity_id = _data.data.id;

                        THIS.render_trunkstore(_data.data, parent);
                    },
                    function(_data, status) {
                        if(status == 400 && _data.message.match(/credit\ card/)) {
                            alert('Whoops! It appears you have no credit card on file. ' +
                                  'You must have a credit card on file before signing up.\n\n' +
                                  'To enter a credit card:\n' +
                                  '1) Click on your account name in the upper righthand corner of Winkstart.\n' +
                                  '2) Click on the Billing Account tab.\n' +
                                  '3) Fill out your credit card information, then press save.');
                        }
                        else {
                            alert('An error occurred during the signup process,' +
                                  ' please try again later! (Error: ' + status + ')');
                        }
                    }
                );
            });

            (parent)
                .empty()
                .append(signup_html);
        },

        activate: function(parent) {
            var THIS = this;

            THIS.list_accounts(function(data, status) {
                    if(data.data.length) {
                        winkstart.apps['connect'].connectivity_id = data.data[0];

                        THIS.get_account(function(_data, status) {
                            /* Hack on first load to get loading... to show up */
                            if(typeof _data.data.account == 'object' && 'credits' in _data.data.account) {
                                delete _data.data.account.credits;
                            }

                            THIS.render_trunkstore(_data.data, parent);
                        });
                    }
                    else {
                        THIS.render_signup(parent);
                    }
                }
            );
        }
    }
);
