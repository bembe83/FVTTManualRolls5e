let rollTypeTemplate = `
	<div style="display: flex; flex-direction:column; align-item: baseline;">
	    <div style="flex:1; margin-bottom: 5px;">Choose weapon <select id="attackType"></select></div>
	    <div style="flex:1; margin-bottom: 5px;">Bonus Action <input type="checkbox" id="isBonusAct"/></div>
	    <div style="flex:1; margin-bottom: 5px;">Hit Dice Roll <input id="hit_roll" type="text" style="width:50px; float:center" value="1" placeholder="Number between 1 and 20"/></div>
	</div>`;
	
let hitTemplate = `
	<div style="display:flex; flex-direction:column; align-item: baseline;">
        <div style="flex:1; margin-bottom: 5px;">Damage Roll <input id="dam_roll" type="text" style="width:50px;float:center" placeholder="Number between 1 and <<dice_face>>"/></div>
        <div style="flex:1; margin-bottom: 5px;">Damage Roll Versatile<input id="dam_roll" type="text" style="width:50px;float:center; block:none" placeholder="Number between 1 and <<dice_face_vers>>"/></div>
    </div>
`;

main();

async function main(){
	const attackType = ["mwak","rwak","msak","rsak"];
	let d;
	if(canvas.tokens.controlled.length == 0 || canvas.tokens.controlled.length > 1)
	{
		ui.notifications.error("Please select a signle token for the attack");
		return;
	}

	let targets = Array.from(game.user.targets);
	if(targets.length == 0)
	{
		ui.notifications.error("Please select a target token for the attack");
		return;
	}

	let actorWeapons = actor.data.items.filter(item => attackType.includes(item.data.data.actionType) && item.data.data.equipped); 

	d = new Dialog({
		title: `Attack Menu`,
		content: rollTypeTemplate,
		buttons: {
			ok: {
				label: `Attack`,
				callback: (html) =>
	            {
		            let weapon_key = html.find('[id=attackType]')[0].value;
		            let isbonusact = html.find('[id=isBonusAct]')[0].value;
		            let hit_roll = html.find('[id=hit_roll]')[0].value;
		            if(Number(hit_roll)<1 || Number(hit_roll)>20 || Number(hit_roll) === NaN)
		            	ui.notification.error("Enter a valid number between 1 and 20 as roll for a d20 dice");
		            else
		            {
		            	Attack(weapon_key, isbonusact, hit_roll);
		            	close();
		            }
	            }       
			},
			close: {
				icon: "<i class='fas fa-tick'></i>",
				label: `Close`
			}
		},
		render: () => { 
			actorWeapons.forEach((value) => {
				let option = new Option(value.data.name, value.data.name);
				document.getElementById("attackType").appendChild(option);
			});},
		default: "close",
		close: () => {}
	});
	d.render(true);	
}

function Attack(weapon_key, isbonusact, hit_value)
{
	let hitDice = "1d20";
	let diceFaces = hitDice.split("d")[1];
	let prof=0;
	let hit_mod = 0;
	let hit_bonus = 0;
	let dam_mod = 0;
	let dam_bonus = 0;

	let actor = canvas.tokens.controlled[0].actor;
	let actorImg = canvas.tokens.controlled[0].data.img;
	let targets = Array.from(game.user.targets).map(token => token.actor);	
	let weapon = actor.data.items.filter(function(item){return item.data.name == weapon_key;})[0];
	let actionType = weapon.data.data.actionType;
	let isProf = weapon.data.data.proficient;
	let weaponName = weapon.data.name;
	let weaponDesc = weapon.data.data.description.chat;
	let weaponDamDice = weapon.data.data.damage.parts[0][0];
	weaponDamDice = weaponDamDice.replace(weaponDamDice.match("\[[a-zA-Z]*\]"),"").replace(/\s{0,}/g, '').split("+")[0];
	let weaponDamDiceVers = weapon.data.data.damage.versatile?weapon.data.data.damage.versatile:"0";
	weaponDamDiceVers = weaponDamDiceVers.replace(weaponDamDiceVers.match("\[[a-zA-Z]*\]"),"").replace(/\s{0,}/g, '').split("+")[0];
		
	console.log(weaponDamDice);
	console.log(weaponDamDiceVers);

	if(isProf)
		prof = actor.data.data.prof;

	switch(actionType)
	{
	case "mwak":
		hit_mod = actor.data.data.abilities.str.mod;
		hit_bonus = weapon.data.data.attackBonus;
		if(isbonusact == "off")
		{
			dam_mod = hit_mod;
			dam_bonus = hit_bonus;
		}
		break;
	case "rwak":
		hit_mod = actor.data.data.abilities.dex.mod;
		hit_bonus = weapon.data.data.attackBonus;
		if(isbonusact == "off")
		{
			dam_mod = hit_mod;
			dam_bonus = hit_bonus;
		}
		break;
	case "mwak":
	case "rsak":
		hit_mod = actor.data.data.abilities.int.mod;
		break;
	default:
		hit_mod = 0;
	}

	let hit_class = "dice-total";
	let dice_class = "roll die d"+diceFaces;
	let crit_hit = "";
	if (hit_value == diceFaces)
	{
		hit_class = hit_class + " critical";
		dice_class = dice_class + " max";
		crit_hit = " Critical";
	}
	else if(hit_value == "1")
	{
		hit_class = hit_class + " fumble";
		crit_hit = " Critical";
		dice_class = dice_class + " min";
	}

	let hit_roll = new Roll(`${hit_value}+${prof}+${hit_mod}+${hit_bonus}`).evaluate({async:false});

	for(let target of targets)
	{
		let targetName =  target.data.name;
		let ac = target.data.data.attributes.ac.value;
		let result = hit_roll.total;
		
		let chatTemplate =`
        <div style="border: 1px;">
	        <span> <img src="${actorImg}" style="width: 60px; height:60px; object-fit: cover; "/></span>
	        <span id="weaponName"><h2>${weaponName}</h2></span>
	        <span id="weaponDesc" style="display: none;">${weaponDesc}<br/></span>
        </div>		
		<div class="dice-roll">
			<div class="dice-result">
		        <div class="dice-formula">${hitDice}+${prof}+${hit_mod}+${hit_bonus}</div>
		        <div class="dice-tooltip" style="display: none;">
		            <section class="tooltip-part">
		                <div class="dice">
		                    <header class="part-header flexrow">
		                        <span class="part-formula">${hitDice}</span>
		                        <span class="${hit_class}" style="word-break: normal;">${hit_value}</span>
		                    </header>
		                    <ol class="dice-rolls">
		                    	<li class="${dice_class}">${hit_value}</li>
		                    </ol>
		                </div>
		            </section>
		        </div>
		        <h4 class="${hit_class}">${result}</h4>
		    </div>
		</div>
		<div id="hit" style="display:none; margin-top: 15px; margin-bottom: 5px; border: inset outset;"><h3>${crit_hit} Hit the target ${targetName}</h3></div>
	    <div id="miss" style="display:none; margin-top: 15px; margin-bottom: 5px; border: inset outset;"><h3>${crit_hit} Miss the target ${targetName}</h3></div>
	    <div><button id="rollDamage" style="display:none">Roll Damage</button></div>
		`;
		
		ChatMessage.create({
			speaker: {
				alias: actor.name
			},
			content: chatTemplate,
			roll: hit_roll,
		});
		
		Hooks.once('renderChatMessage', (chatItem, html) => {
		    html.find("#weaponName").click(()=>{
			    if(html.find("#weaponDesc")[0].style.display == "none")
					html.find("#weaponDesc")[0].style.display="block";
				else
					html.find("#weaponDesc")[0].style.display="none";
			});
			if(result > ac)
			{
				let damDiceFaces = weaponDamDice.split("d")[1]? weaponDamDice.split("d")[1]: 0;
				let damVersDiceFaces = weaponDamDiceVers.split("d")[1]?weaponDamDiceVers.split("d")[1]:0;
				html.find("#hit")[0].style.display = "block";
				html.find("#rollDamage")[0].style.display = "block";
				html.find("#rollDamage").click(() => {
				    new Dialog({
				        title:"Enter damage roll",
				        content: hitTemplate.replace("<<dice_face>>",damDiceFaces).replace("<<dice_face_vers>>",damVersDiceFaces),
				        buttons: {
					        ok: {
							    label: `Damage`,
							    callback: (html) =>
				                {
					                let dam_roll = html.find('[id=dam_roll]')[0].value;
					                let damage_roll = new Roll(`${dam_roll}+${hit_mod}+${hit_bonus}`).evaluate({async:false});
					                let diceDamFaces = weaponDamDice.split("d")[1];
					                let hit_class = "dice-total";
					                let dice_class = "roll die d"+diceDamFaces;
					            	if (dam_roll == diceFaces)
					            	{
					            		hit_class = hit_class + " critical";
					            		dice_class = dice_class + " max";
					            	}
					            	else if(dam_roll == "1")
					            	{
					            		hit_class = hit_class + " fumble";
					            		dice_class = dice_class + " min";
					            	}
					        		let DamRollTemplate =`
					        			<div class="dice-roll">
					        				<div class="dice-result">
					        					<div class="dice-formula">${weaponDamDice}+${hit_mod}+${hit_bonus}</div>
					        					<div class="dice-tooltip" style="display: none;">
					        						<section class="tooltip-part">
					        							<div class="dice">
					        								<header class="part-header flexrow">
					        									<span class="part-formula">${weaponDamDice}</span>
					        									<span class="${hit_class}" style="word-break: normal;">${dam_roll}</span>
					        								</header>
					        								<ol class="dice-rolls">
					        									<li class="${dice_class}">${dam_roll}</li>	
					        								</ol>
					        							</div>
					        						</section>
					        					</div>
					        					<h4 class="${hit_class}">${damage_roll.total}</h4>
					        				</div>
					        			</div>
					        		`;
					                damage_roll.toMessage({
					                	content: DamRollTemplate,
						                speaker: {
							                alias: actor.name
						                }
						            });
					                close();
				                }
			                },
					        close: {
						        icon: "<i class='fas fa-tick'></i>",
						        label: `Close`
					        }
				        },
					    default: "close",
						close: () => {}
				   }).render(true);    
				});
			}
			else
				html.find("#miss")[0].style.display = "block";
		});
	}
	return;
}