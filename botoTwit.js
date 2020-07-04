var Twit = require('twit')
const chalk = require("chalk");
var figlet = require('figlet');
var columnify = require('columnify')
const { program } = require('commander');

var T = new Twit({
	consumer_key:         '',
	consumer_secret:      '',
	access_token:         '',
	access_token_secret:  '',
	timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
	strictSSL:            true,     // optional - requires SSL certificates to be valid.
}) 

figlet('BotoTwit', function(err, data) {
	if (err) {
		console.log('Something went wrong...');
		console.dir(err);
		return;
	}
	console.log(data)
});



program
.requiredOption('-u, --user <type>', 'Twitter tag user to scan')
.option('-f, --followers <type>', 'Number of followers to scan (default:20, max:200)')
.option('-d, --debug', 'output extra debugging')
.description('Dev by @atmon3r 2020\n\nBototwit allows you to scan the followers of a twitter account\nand calculate each follower to determine the type of account\nis a bot or not.'
	+'\n\nCalculation model:'
	+'\n   - Ratio of follower/Subscribers'
	+'\n   - The number of tweet per day since the creation of the account'
	+'\n   - Image profile exist'
	+'\n   - Banner profile exist'
	+'\n   - Description exist'
 
	
)
 
// must be before .parse()
program.on('--help', () => {
	console.log('');
	console.log('Example call:');
	console.log('  $node botoTwit -u atmon3r -f 200');
});

program.parse(process.argv);

if (program.debug) console.log(program.opts());
 
 

var copie = [];
var userTested = ''; 
userTested = program.user;
 
if (program.followers) {
	var numTest = program.followers;
} else
	var numTest = '20';

function days_between(date1,date2) {
	// The number of milliseconds in one day
	const ONE_DAY = 1000 * 60 * 60 * 24;	
	// Calculate the difference in milliseconds
	const differenceMs = Math.abs(date1 - date2);	
	// Convert back to days and return
	return Math.round(differenceMs / ONE_DAY);
	
}
function numAverage(a) {
	var b = a.length,
	c = 0, i;
	for (i = 0; i < b; i++){
		c += Number(a[i]);
	}
	return c/b;
}
//
//  get the list of user id's of @
//
T.get('followers/list', { screen_name: userTested, count: numTest },  function (err, data, response) {
	//console.log(data.users)
	var datetime = new Date();
 
	console.log('[*] Start scan of user: @'+userTested);
	console.log('[*] Start scan start at: '+datetime);
	console.log('[*] Scan: '+numTest+' Followers');
	console.log('');	
	data.users.forEach(function(item){
		var scoringUser = 0;
		var ratio = item.followers_count / item.friends_count
		console.log('@'+item.screen_name)
		console.log('  [*] Followers: '+item.followers_count+' / Subscribers: '+item.friends_count)
		if (item.followers_count / item.friends_count > 1) {
			//console.log(ratio.toFixed(2))
			console.log('  [*] Ratio F/S: '+ chalk.green(ratio.toFixed(2)))	
			scoringUser++;
		} else {
			console.log('  [*] Ratio F/S: '+ chalk.red(ratio.toFixed(2)))
		}
		let ts = Date.now();
		var days_betweenn = days_between(Date.parse(item.created_at),ts)
		var tweetByDay = item.statuses_count/days_betweenn

		console.log('  [*] Tweet(s): '+item.statuses_count+' / Since: '+ days_betweenn +' day')
		if (tweetByDay.toFixed(2) > 5) {
			console.log('  [*] Tweets by day: '+ chalk.green(tweetByDay.toFixed(2)))	
			scoringUser++;
		} else {
			if (tweetByDay.toFixed(2) === 'NaN')
				console.log('  [*] Tweets by day: 0.00')
			else
				console.log('  [*] Tweets by day: '+ chalk.red(tweetByDay.toFixed(2)))
		}
		if (item.profile_image_url_https != 'https://abs.twimg.com/sticky/default_profile_images/dstatusefault_profile_normal.png') {
			console.log('  [*] Image profile: '+ chalk.green('Ok'))			
			scoringUser++;
		} else {
			console.log('  [*] Image profile: '+ chalk.red('No profile img'))
		}		
		if (item.profile_background_image_url_https) {
			console.log('  [*] Banner profile: '+ chalk.green('Ok'))	
			scoringUser++;
		} else {
			console.log('  [*] Banner profile: '+ chalk.red('No banner img'))
		}
		if (item.description) {
			console.log('  [*] Profil description: '+ chalk.green('Ok'))
			scoringUser++;			
		} else {
			console.log('  [*] Profil description: '+ chalk.red('No description'))
		} 
		if (item.location) {
			console.log('  [*] Profil location: '+ chalk.green(item.location))	
			//scoringUser++;
		}  
		if (scoringUser*4 < 10) {
			console.log('  [*] Scoring: '+ chalk.red(scoringUser*4+'/20'))	
			var isBot = 'bot'
		} else if (scoringUser*4 > 10 && scoringUser*4 < 14) {
			console.log('  [*] Scoring: '+ chalk.yellow(scoringUser*4+'/20'))
			var isBot = 'likely'
		} else {
			console.log('  [*] Scoring: '+ chalk.green(scoringUser*4+'/20'))
			var isBot = 'notBot'
		}	
		console.log('');
		
		copie.push({user:'@'+item.screen_name, scoring:scoringUser*4, isBotFinal:isBot});
		//console.log('  [*] Final Scoring: '+scoringUser*4+'/20');
	});		
	var moyene = 0;
	var bot = 0;
	var likely = 0;
	var notBot = 0;
	copie.forEach(function(item,idx){ 
		//console.log(item.user,item.scoring);
		moyene = moyene + item.scoring;
		switch (item.isBotFinal) {
			case 'bot':
				bot++;
				break;
			case 'likely':
				likely++;
				break;
			case 'notBot':
				notBot++;
				break;
		}
		
		if (idx === copie.length - 1){ 
			//console.log("Last callback call at index " + idx + " with value " + item ); 
			//console.log(moyene/copie.length)
			console.log('[*]**************** Scan result ******************** ')
			console.log('');
			var data = {
			   "[*] User tested: ": '@'+userTested,
			   "[*] Followers tested:": copie.length,
			   "[*] Is not bot:": notBot,
			   "[*] Likely bot:": likely,
			   "[*] Is bot:": bot
			}			
			console.log(columnify(data, {
				showHeaders: false
			}))
			
			FinalScoringUser = moyene/copie.length;
			if (FinalScoringUser < 10) {
				console.log('[*] Final Scoring:    '+ chalk.red(FinalScoringUser.toFixed(2)+'/20'))		
			} else if (FinalScoringUser > 10 && FinalScoringUser < 12) {
				console.log('[*] Final Scoring:    '+ chalk.yellow(FinalScoringUser.toFixed(2)+'/20'))
			} else 
				console.log('[*] Final Scoring:    '+ chalk.green(FinalScoringUser.toFixed(2)+'/20'))
			console.log('');	
			console.log('[*]************************************************* ')
			console.log('');
		}		
	})

})
