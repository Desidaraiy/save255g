var myApp = new Framework7({
    tapHold: true,
    tapHoldDelay: 1500,
    modalButtonCancel: 'Отмена',
    cache: false,
    modalTitle: 'Сэйв.info'
});

var $$ = Dom7;

var mainView = myApp.addView('.view-main', {
    dynamicNavbar: true,
    swipeBackPage: false,
    uniqueHistory: true
});

var db = null;
var pushid = '';
var lockTime = false;
var enterCode = '0';

var enternet, messageBox, avatar, login, pinCode, userData, dblogin, logged, notesBox, noteText, myMessagebar, mySearchbar, opts, numberHolder, notificationReceivedCallback, notificationOpenedCallback;

var intrro = myApp.onPageInit('home', function (page) {
    messageBox = myApp.messages('.messages', {
        autoLayout: false,
        scrollMessages: true
    });

    // $$('div#messageholder').html('<p class="ifmiss">Входящих сообщений пока нет.</p>');

    $$('div.rightblock').on('click', function(){
        myApp.confirm('Вы действительно хотите принудительно обновить все сообщения?', 'Сэйв.info', function () {
            db.executeSql('DROP TABLE saveMessagesTable');
            messageBox.clean();
            $$('select[name="objectselect"]').html('');
            checkMessagesOne();
        }); 
    });
});

$$(document).on('deviceready', function(mainView) {
    db = window.sqlitePlugin.openDatabase({name: 'savedb2.db', location: 'default'});
    notificationOpenedCallback = function() {
        checkMessagesOne();
    };
    window.plugins.OneSignal
    .startInit("be981bb2-5fe4-448d-abfb-75e3499cc06b", "90230104830")
    .inFocusDisplaying(window.plugins.OneSignal.OSInFocusDisplayOption.None)
    .handleNotificationOpened(notificationOpenedCallback)
    .endInit();
    window.plugins.OneSignal.getIds(function(ids){
        pushid = ids.userId; 
        return pushid;
    });
    document.addEventListener("pause", onPause, false);
    document.addEventListener("resume", onResume, false);
    document.addEventListener("backbutton", onBackKeyDown, false);
    // проверка сети
    gpsEnternetCheck();
    // проверка пользователя, начало
    userCheck();
});

// коллбеки
function onBackKeyDown(){
    var page = myApp.getCurrentView().activePage;
    if(page.name == 'home' ){
        myApp.confirm('Вы действительно хотите выйти из приложения?', 'Сэйв.info', function () {
            navigator.app.exitApp();
        }); 
    } else if(page.name == 'signup'){  
        myApp.confirm('Вы действительно хотите выйти из приложения?', 'Сэйв.info', function () {
            navigator.app.exitApp();
        }); 
    } else if(page.name == 'code') {
        console.log('not exit');
    } else {
        mainView.router.back();
    }
}

function onPause(){
    setTimeout(function() {
        lockTime = true;
    }, 120000);
}

function onResume() {
    setTimeout(function() {
        if(lockTime == true){
            userCheck();
        }
        lockTime=false;
    }, 500);
}

// !коллбэки

myApp.onPageInit('signup', function (page) {
    login = '';
    $$('#fstep').on('click', function () {
        myApp.showIndicator();
        login = $$('input[name="code"]').val();
        if(login.length >= 10){   
            if(login !== ''){
                myApp.hideIndicator();
                pinCode = '';
                mainView.router.load({url: 'code.html'});
            }else{
                myApp.hideIndicator();
                myApp.alert('Введите номер телефона','Сэйв.info');
            }
        }else{
            myApp.hideIndicator();
            myApp.alert('Введите корректный номер телефона', 'Сэйв.info');
        }    
    });
    
});

myApp.onPageInit('code', function (page) {
    $$('#userremove').on('click', function () {
        myApp.confirm('Вы действительно хотите удалить регистрационные данные?', 'Сэйв.info', function () {
            db.executeSql('DROP TABLE saveMessagesTable');
            db.executeSql('DROP TABLE notessTable');
            db.executeSql('DROP TABLE sosTable');
            $$.ajax({
                type: "GET",
                url: "https://baykminer.ru/sos/userremove.php",
                headers: {
                    'header1': 'textos'
                },
                data: { 
                    'remove': 1,
                    'uid': pushid
                    },
                crossDomain: true,
                cache: false,
                error: function(response){
                    myApp.alert('Нет подключения к интернету.', 'Сэйв.info');
                },
                success: function(response){
                    if(response == 1){
                        myApp.confirm('Регистрация успешно удалена! Перезапустите приложение, чтобы изменения вступили в силу.', 'Сэйв.info', function(){
                            navigator.app.exitApp();
                        });
                    } else {
                        myApp.alert('Ошибка');
                    }
                }
            });
        }); 
    });

    if(pinCode !== ''){
        myApp.hideIndicator();
        intro();
    }else{
        myApp.hideIndicator();
        newpin(login);
    }

});

// по заметкам
myApp.onPageInit('notes', function (page) {
    notesSaver = $$('.notesaver');
    notesBox = myApp.messages('.notes', {
        autoLayout: true,
        scrollMessages: true,
        newMessagesFirst: true
    }); 
    myMessagebar = myApp.messagebar('.messagebar', {
        maxHeight: 200
    }); 
    showNotes(notesBox);
    notesSaver.on('click', function(){
        saveNote(myMessagebar.value());
    });
});

function saveNote(noteText){
    tm = new Date();
    function addZero(n) {
        if(n < 10){
            return "0"+n;
        }else{
            return n;
        }
    }
    noteDate = addZero(tm.getDate()) + "." + addZero((tm.getMonth() + 1)) + "." + tm.getFullYear() + " " + addZero(tm.getHours()) + ":" + addZero(tm.getMinutes());
    db.executeSql('CREATE TABLE IF NOT EXISTS notessTable(notetext, date)');
    db.executeSql('INSERT INTO notessTable(notetext, date) VALUES(?, ?)', [noteText, noteDate]);
    showNote();
}

function showNote(){
    db.executeSql('SELECT * FROM notessTable', [], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
        }
        notesBox.prependMessage({
            text: row.notetext,
            type: 'sent',
            name: row.date,
            avatar: avatar
        }, false);
        myMessagebar.clear();
        notesBox.scrollMessages();
    });
}

function showNotes(notesBox){
    db.executeSql('SELECT * FROM notessTable', [], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            notesBox.prependMessage({
                text: row.notetext,
                type: 'sent',
                name: row.date,
                avatar: avatar
            }, false);
        }
        notesBox.scrollMessages();
    });
}
// !по заметкам

function recordUser(userData){
    db.transaction(function(tx) {
        tx.executeSql('DROP TABLE IF EXISTS sosTable');
        tx.executeSql('CREATE TABLE IF NOT EXISTS sosTable(password, login)');
        console.log('таблица открыта!');
        tx.executeSql('INSERT INTO sosTable(password, login) VALUES(?, ?)', [userData[0], userData[1]]);
        }, function(error) {
        console.log('Transaction ERROR: ' + error.message);
        }, function() {
        console.log('пользователь в базе данных!');

        // function createFile() {
        //     window.requestFileSystem(window.PERSISTENT, 0, successCallback, errorCallback)
        //     function successCallback(fs) {
        //       fs.root.getFile('log.txt', {create: true, exclusive: true}, function(fileEntry) {
        //          console.log('File creation successfull!');
        //       }, errorCallback);
        //     }

        //     function errorCallback(error) {
        //       console.log("ERROR: " + error.code);
        //     }
        // }
        // createFile();
    });
}

// проверка пользователя
function userCheck() {

    myApp.showIndicator();

    db.executeSql('SELECT count(*) AS tablecount FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'sosTable'], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
        }
        if(row.tablecount == 1){
            db.executeSql('SELECT * FROM sosTable', [], function(result) {
                if (result != null && result.rows != null) {
                    for (var i = 0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                    }
                        if(row.login != 0) {  
                            myApp.hideIndicator();
                            pinCode = row.password;
                            mainView.router.loadPage({url: 'code.html'});
                        } else {
                            myApp.hideIndicator();
                            mainView.router.loadPage({url: 'signup.html'});
                        }
                }else{
                    myApp.hideIndicator();
                    mainView.router.loadPage({url: 'signup.html'});
                }
            });

        } else {
            myApp.hideIndicator();
            mainView.router.loadPage({url: 'signup.html'});
            // checkIfFileExists('log.txt');
        }
    });

        // function checkIfFileExists(path){
        //     window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
        //         fileSystem.root.getFile(path, { create: false }, fileExists, fileDoesNotExist);
        //     }, getFSFail); 
        // }
        // function fileExists(fileEntry){

        //     myApp.hideIndicator();
        //     mainView.router.loadPage({url: 'signup.html'});

        // }
        // function fileDoesNotExist(){
        //     myApp.hideIndicator();
        //     mainView.router.loadPage({url: 'signup.html'});
        // }
        // function getFSFail(evt) {
        //     console.log(evt.target.error.code);
        // }

    
}
// скачиваение последних сообщений
function downloadingMessages(lastdate){
    myApp.showIndicator();
    $$.ajax({
        type: "GET",
        url: "https://baykminer.ru/sos/pushes.php?lastdate="+lastdate+"&uid="+pushid,
        crossDomain: true,
        cache: false,
        success: function(result){
            result = $.parseJSON(result);
            if(result[result.length - 1].date.toString() === lastdate){ 
                db.executeSql('SELECT DISTINCT objnum FROM saveMessagesTable', [], function(result) {
                    for (var i = 0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                        myApp.smartSelectAddOption('.smart-select select[name="objectselect"]', '<option value="'+row.objnum+'">'+row.objnum+'</option>');
                    }
                });
                showMessages(messageBox);  
            }else{
                db.executeSql('DELETE FROM saveMessagesTable WHERE date = ?', [lastdate], function() {
                    console.log('последнее сообщение удалено.');
                });
                $$.each(result, function(i, field){
                    db.executeSql('INSERT INTO saveMessagesTable(title, message, date, readed, objnum) VALUES(?, ?, ?, ?, ?)', [1, field.message, field.date, 0, field.obj_num], function(result){
                        console.log('ok');
                    });
                }); 
                db.executeSql('SELECT DISTINCT objnum FROM saveMessagesTable', [], function(result) {
                    for (var i = 0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                        myApp.smartSelectAddOption('.smart-select select[name="objectselect"]', '<option value="'+row.objnum+'">'+row.objnum+'</option>');
                    }
                });
                showMessages(messageBox);  
            }
        }
    });  
}
// скачивание всех сообщений
function downloadingAllMessages(){
    myApp.showIndicator();
    $$.ajax({
        type: "GET",
        url: "https://baykminer.ru/sos/pushes.php?uid="+pushid,
        crossDomain: true,
        cache: false,
        success: function(result){
            result = $.parseJSON(result);
            if(result.status != 'empty'){ 
                $$.each(result, function(i, field){
                    db.executeSql('INSERT INTO saveMessagesTable(title, message, date, readed, objnum) VALUES(?, ?, ?, ?, ?)', [1, field.message, field.date, 0, field.obj_num], function(){
                        console.log('ok');
                    });
                }); 
                db.executeSql('SELECT DISTINCT objnum FROM saveMessagesTable', [], function(resulta) {
                    for (var i = 0; i < resulta.rows.length; i++) {
                        var row = resulta.rows.item(i);
                        myApp.smartSelectAddOption('.smart-select select[name="objectselect"]', '<option value="'+row.objnum+'">'+row.objnum+'</option>');
                    }
                });
                showMessages(messageBox);  
            }else { 
                myApp.hideIndicator();
            }
        }
    });  
}

function checkMessagesOne(){
    myApp.showIndicator();
    db.executeSql('SELECT count(*) AS tablecount FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'saveMessagesTable'], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
        }
        if(row.tablecount == 1){
                if(enternet == 1){
                    db.executeSql('SELECT * FROM saveMessagesTable ORDER BY id DESC LIMIT 1', [], function(resulta) {
                        for (var i = 0; i < resulta.rows.length; i++) {
                            var rowa = resulta.rows.item(i);
                        }
                        downloadingMessages(rowa.date);
                    });

                } else {
                    myApp.alert('Обновление сообщений без подключения к интернету невозможно.', 'Сэйв.info'); 
                }
                myApp.hideIndicator();
        }else{
            db.executeSql('CREATE TABLE IF NOT EXISTS saveMessagesTable(id INTEGER PRIMARY KEY, title, message, date, readed, objnum)');

            if(enternet == 1){
                downloadingAllMessages();
            }else{
                myApp.alert('Обновление сообщений без подключения к интернету невозможно.', 'Сэйв.info'); 
            } 
        }
    });
}

function showMessages(messageBox) {
    db.executeSql('SELECT * FROM saveMessagesTable', [], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            messageBox.prependMessage({
                text: row.message,
                type: 'received',
                name: row.date,
                avatar: avatar
            }, false);
        }
        db.executeSql('UPDATE saveMessagesTable SET readed = ? WHERE readed = ?', [1, 0], function(result) {    
           console.log('успешно!');
        });
    });

    lockTime = false;

    myApp.hideIndicator();

    $$('select[name="objectselect"]').on('change', function () {
        messageBox.clean();
        objnumber = $$(this).val();
        if(objnumber == 'all'){
            db.executeSql('SELECT * FROM saveMessagesTable', [], function(result) {
                for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows.item(i);
                    messageBox.prependMessage({
                        text: row.message,
                        type: 'received',
                        name: row.date,
                        avatar: avatar
                    }, false);
                }
            });                
        }else {
            db.executeSql('SELECT * FROM saveMessagesTable WHERE objnum = ?', [objnumber], function(result) {
                for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows.item(i);
                    messageBox.prependMessage({
                        text: row.message,
                        type: 'received',
                        name: row.date,
                        avatar: avatar
                    }, false);
                }

            });

        }
    });

    var myCalendarOne = myApp.calendar({
        closeOnSelect:true,
        input: '#dateone',
        dateFormat: 'yyyy-mm-dd',
        monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август' , 'Сентябрь' , 'Октябрь', 'Ноябрь', 'Декабрь'],
        dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    });   
    var myCalendarTwo = myApp.calendar({
        closeOnSelect:true,
        input: '#datetwo',
        dateFormat: 'yyyy-mm-dd',
        monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август' , 'Сентябрь' , 'Октябрь', 'Ноябрь', 'Декабрь'],
        dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    });   

    $$('a.sendik').on('click', function(){
        dateone = $$('input.second').val();
        datetwo = $$('input.third').val();
        objnumber = $$('select#objectsel').val();
        if(dateone != "" && datetwo != ""){
           if(objnumber !== 'all'){
                myApp.prompt('Введите email на который отправить отчет', function(value){
                    $$.ajax({
                        type: "GET",
                        url: "https://baykminer.ru/sos/senddoc1.php",
                        headers: {
                            'header1': 'textos'
                        },
                        data: { 
                            'objnumber': objnumber, 
                            'dateone': dateone+' 00:00:00', 
                            'datetwo': datetwo+' 23:59:59', 
                            'value': value
                        },
                        crossDomain: true,
                        cache: false,
                        error: function(response){
                            myApp.alert('Нет подключения к интернету.', 'Сэйв: кнопка SOS');
                        },
                        success: function(response){
                            myApp.alert('Отчет будет отправлен на указанную почту в течение 5-ти минут!');

                        }
                    });
                });
           }else {
                myApp.alert('выберите объект');
           }
        }else{
            myApp.alert('Заполните поля даты от и даты до.');
        }

    });

}

function sendpushik(text, name){
    page = myApp.getCurrentView().activePage;
    if(page.name == 'home'){ 
        myApp.prompt('Имя для заметки?', 'Сэйв.info', function(value){
            saveNote('| ' + value + ' | от ' + name + ' | ' + text);
            myApp.alert('сохранено!', 'Сэйв.info');
        });
    }else if(page.name == 'notes'){
        db.executeSql('SELECT * FROM notessTable WHERE notetext = ?', [text], function(result) {
        for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
        }
            myApp.prompta('Редактирование заметки...', 'Сэйв.info', row.notetext, function(value){
                tm = new Date();
                function addZero(n) {
                    if(n < 10){
                        return "0"+n;
                    }else{
                        return n;
                    }
                }
                noteDate = addZero(tm.getDate()) + "." + addZero((tm.getMonth() + 1)) + "." + tm.getFullYear() + " " + addZero(tm.getHours()) + ":" + addZero(tm.getMinutes());
                db.executeSql('UPDATE notessTable SET notetext = ? WHERE notetext = ?', [value, row.notetext]);
                mainView.router.refreshPage();
                myApp.alert('сохранено!', 'Сэйв.info');
            });

        });
        
    } else {
        console.log('ok');
    }
}

function gpsEnternetCheck() {
    var networkState = navigator.connection.type;
    if(networkState !== Connection.NONE) {
        enternet = 1;
    } else {
        myApp.alert('Пожалуйста, включите передачу данных.', 'Сэйв.info');
    }
}

function routings(response){
    response = $.parseJSON(response);
    switch(response.result){
        case "ok":
            mainView.router.load({url: 'index.html'});
            checkMessagesOne();
        break;
        case "error":
            myApp.alert('Ошибка входа', 'Сэйв.info');
            mainView.router.loadPage({url: 'signin.html'});
        break;
        case "edit":
            db.executeSql('SELECT * FROM sosTable', [], function(result) {
                if (result != null && result.rows != null) {
                    for (var i = 0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                    }
                    db.executeSql('UPDATE sosTable SET login = ? WHERE login = ?', [response.newphone, row.login], function(result) {    
                        myApp.confirm('Ваш номер телефона был изменен на правильный модератором, перезапустите приложение.', 'Сэйв.info', function () {
                            navigator.app.exitApp();
                        }); 
                    })
                }else{
                    myApp.confirm('Ошибка, перезапустите приложение.', 'Сэйв.info', function () {
                        navigator.app.exitApp();
                    }); 
                }
            });

        break;
        default:
            myApp.alert('Ошибка', 'Сэйв.info');
            mainView.router.loadPage({url: 'signin.html'});
        break;
    }
}

function registration(){
    window.plugins.OneSignal.getIds(function(ids){
        $$.ajax({
            type: "GET",
            url: "https://baykminer.ru/sos/register.php",
            headers: {
                'header1': 'textos'
            },
            data: { 
                'login': login,
                'password': pin,
                'pushid': ids.userId
                },
            crossDomain: true,
            cache: false,
            error: function(response){
                myApp.alert('Нет подключения к интернету.', 'Сэйв.info');
            },
            success: function(response){
                myApp.showIndicator();
                userData = [pin, login];
                recordUser(userData);
                myApp.confirm('Регистрация успешно завершена! Перезапустите приложение, чтобы изменения вступили в силу.', 'Сэйв.info', function(){
                    navigator.app.exitApp();
                });
                mainView.router.load({url: 'index.html'});
                myApp.hideIndicator();
            }
        });
    });
}


function newpin(login){
    enterCode = '';
    $$('p.texter').html('Введите новый пин-код');
    $$('.numberss').on('click', function(event) {
        clickedNumber = $$(this).text().toString(); 
        enterCode = enterCode + clickedNumber; 
        lengthCode = parseInt(enterCode.length);
        lengthCode--;
        $$(".numberfield").eq(lengthCode).addClass("passwdr");
        if (lengthCode == 3) {
            pin = enterCode;
            enterCode = '';
            $$(".numberfield").removeClass("passwdr");
            proof(pin, login, enterCode);
        }
    });
}

function proof(pin, login, enterCode){
    $$('.texter').html('Подтвердите пин-код');
    $$('.numberss').on('click', function(event) {
        clickedNumber = $$(this).text().toString();
        enterCode = enterCode + clickedNumber;
        lengthCode = parseInt(enterCode.length);
        lengthCode--;
        $$(".numberfield").eq(lengthCode).addClass("passwdr");
        if(lengthCode == 3){
            if(enterCode == pin){
                $$(".numberfield").removeClass("passwdr");
                registration(login, pin);
            } else {
                enterCode = '';
                $$(".numberfield").removeClass("passwdr");
                $$('.texter').html('попробуйте еще раз!');
            }
        }
    });
}

function intro(){
    enterCode = '';  
    lengthCode = null;
    $$('.texter').html('Введите Ваш пин-код');
    db.executeSql('SELECT * FROM sosTable', [], function(result) {
    for (var i = 0; i < result.rows.length; i++) {
        var row = result.rows.item(i);
    }
    dblogin = row.login;
    pin = row.password;
});

  $$('.numberss').on('click', function(event) {
      clickedNumber = $$(this).text().toString();
      enterCode = enterCode + clickedNumber;
      lengthCode = parseInt(enterCode.length);
      lengthCode--;
      $$(".numberfield").eq(lengthCode).addClass("passwdr");
      if (lengthCode == 3){
        // ключ
        if (enterCode == pin) {
          // верный пин-код
          $$(".numberfield").addClass("right");
          $$("#numbers").addClass("hide");
            $$.ajax({
                type: "GET",
                url: "https://baykminer.ru/sos/login2.php",
                headers: {
                    'header1': 'textos'
                },
                data: { 
                    'login': dblogin,
                    'password': pin
                    },
                crossDomain: true,
                cache: false,
                error: function(response){
                    myApp.alert('Нет подключения к интернету.', 'Сэйв.info');
                    mainView.router.loadPage({url: 'signin.html'});
                },
                success: function(response){
                    routings(response);
                }
            });
        } else {
          $$("#fields").addClass("miss");
          enterCode = "";
          setTimeout(function() {
            $$("#fields .numberfield").removeClass("passwdr");
          }, 200);
          setTimeout(function() {
            $$("#fields").removeClass("miss");
          }, 500);
        }
      } 
  });
 }
