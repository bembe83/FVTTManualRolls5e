let rollTypeTemplate = `
	<div style="display: flex; flex-direction:column;">
	    <div style="flex:1">Choose weapon <select id="attackType"></select><br/><br/></div>
	    <span style="flex:1">Bonus Action <input type="checkbox" id="isBonusAct"/><br/><br/></span>
	    <span style="flex:1">Hit Dice Roll <input id="hit_roll" type="text" style="width:50px;float:center" value="1" /><br/><br/></span>
	</div>`;
	
let hitTemplate = `
	<div style="display:flex">
        <span style="flex:1">Damage Roll <input id="dam_roll" type="text" style="width:50px;float:center" /></span>
    </div>
`;

let chatTemplate =`
	<div>Rolled: <span style="color: ${hit_color}">${result}</span> against ${ac} Target Armor</div>
	<div>It was a${crit_hit} Hit!</div>
	<div><button id="rollDamage">Roll Damage</button></div>
`;

main();

async function main(){
	const attackType = ["mwak","rwak","msak","rsak"];
	let d;
	if(canvas.tokens.controlled.length == 0 || canvas.tokens.controlled.length > 1)
	{
		ui.notification("Please select a signle token for the attack");
		return;
	}

	let targets = Array.from(game.user.targets);
	if(targets.length == 0)
	{
		ui.notification("Please select a target token for the attack");
		return;
	}

	let actorWeapons = actor.data.items.filter(item => attackType.includes(item.data.data.actionType)); 

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
		            //let dam_roll = html.find('[id=dam_roll]')[0].value;
		            Attack(weapon_key, isbonusact, hit_roll);
		            close();
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
	let prof=0;
	let hit_mod = 0;
	let hit_bonus = 0;
	let dam_mod = 0;
	let dam_bonus = 0;

	let actor = canvas.tokens.controlled[0].actor;
	let targets = Array.from(game.user.targets).map(token => token.actor);
	
	console.log(targets);
	
	let weapon = actor.data.items.filter(function(item){return item.data.name == weapon_key;})[0];
	let actionType = weapon.data.data.actionType;
	let isProf = weapon.data.data.proficient;

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

	let hit_color = "#000000";
	let crit_hit = "";
	if (hit_value == "20")
	{
		hit_color = "#00aa05";
		crit_hit = " Critical";
	}
	else if(hit_value == "1")
	{
		hit_color = "#e50303";
		crit_hit = " Critical";
	}

	let hit_roll = new Roll(`${hit_value}+${prof}+${hit_mod}+${hit_bonus}`).evaluate({async:false});

	for(let target of targets)
	{
		console.log(target);
		let ac = target.data.data.attributes.ac.value;
		let result = hit_roll.total;
		
		if(result>ac)
		{
			chatTemplate = `
				<p> Rolled: <span style="color: ${hit_color}">${result}</span> against ${ac} Target Armor </p>
				<p> It was a${crit_hit} Hit! </p>
				<p> <button id="rollDamage">Roll Damage</button></p>
				`;
		} else {
			chatTemplate = `
				<p> Rolled: <span style="color: ${hit_color}">${result}</span> against ${ac} Target Armor </p>
				<p> It was a${crit_hit} Miss! </p>
				`;
		}
		ChatMessage.create({
			speaker: {
				alias: actor.name
			},
			content: chatTemplate,
			roll: hit_roll
		});
		Hooks.once('renderChatMessage', (chatItem, html) => {
			html.find("#rollDamage").click(() => {
			    new Dialog({
			        title:"Enter damage roll",
			        content: hitTemplate,
			        buttons: {
				        ok: {
						    label: `Damage`,
						    callback: (html) =>
			                {
				                let dam_roll = html.find('[id=dam_roll]')[0].value;
				                let damage_roll = new Roll(`${dam_roll}+${hit_mod}+${hit_bonus}`);
				                damage_roll.toMessage({
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
		});
	}
	return;
}